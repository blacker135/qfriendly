// app/api/subscription/webhook/route.ts
// POST /api/subscription/webhook — 接收 PayPal 订阅事件回调

import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { verifyWebhookSignature, getVariantName } from '@/lib/paypal';
import { trackSubscriptionEvent, getBillingPeriod, getPlanChangeDirection } from '@/lib/stats/revenue';
import type { PlanVariant } from '@/lib/stats/revenue';

interface PayPalWebhookEvent {
  event_type: string;
  resource: {
    id: string;
    plan_id?: string;
    status?: string;
    billing_info?: {
      next_billing_time?: string;
    };
    create_time?: string;
  };
}

/** PayPal 状态 → DB status */
function mapStatus(paypalStatus: string): 'active' | 'suspended' | 'cancelled' | 'expired' {
  const statusMap = {
    ACTIVE: 'active' as const,
    SUSPENDED: 'suspended' as const,
    CANCELLED: 'cancelled' as const,
    EXPIRED: 'expired' as const,
  };
  return statusMap[paypalStatus as keyof typeof statusMap] || 'cancelled';
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const signatureHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    signatureHeaders[key.toLowerCase()] = value;
  });

  const verified = await verifyWebhookSignature(signatureHeaders, rawBody);
  if (!verified) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event.event_type;
  const subId = event.resource.id;
  const planId = event.resource.plan_id || '';
  const eventStatus = event.resource.status;
  const nextBilling = event.resource.billing_info?.next_billing_time;

  try {
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.RENEWED': {
        // upsert：webhook 可能在 activate API 之前到达
        const variantName = planId ? (getVariantName(planId) || 'start') : 'start';

        await db
          .insert(schema.subscriptions)
          .values({
            paypalSubscriptionId: subId,
            paypalPlanId: planId,
            variantName,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: nextBilling ? new Date(nextBilling) : undefined,
            userId: '', // 占位；webhook 无 userId，后续可通过 activate API 更新
          })
          .onConflictDoUpdate({
            target: schema.subscriptions.paypalSubscriptionId,
            set: {
              status: 'active',
              ...(planId ? { paypalPlanId: planId, variantName } : {}),
              ...(nextBilling ? { currentPeriodEnd: new Date(nextBilling) } : {}),
              updatedAt: new Date(),
            },
          });

        // 异步写入订阅事件流水（fire-and-forget，不阻塞 webhook 响应）
        const billingPeriod = planId ? getBillingPeriod(planId) : undefined;
        trackSubscriptionEvent({
          userId: '', // webhook 阶段尚无 userId，后续可通过 activate API 关联
          eventType: eventType === 'BILLING.SUBSCRIPTION.ACTIVATED' ? 'created' : 'renewed',
          plan: variantName as PlanVariant,
          billingPeriod,
          paypalSubscriptionId: subId,
        });
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.PAYMENT_FAILED': {
        // 查询已有订阅以获取 userId 和方案（用于事件追踪）
        const isCancelOrExpire =
          eventType === 'BILLING.SUBSCRIPTION.CANCELLED' ||
          eventType === 'BILLING.SUBSCRIPTION.EXPIRED';
        let existingSub: { userId: string; variantName: string } | undefined;
        if (isCancelOrExpire) {
          const row = await db.query.subscriptions.findFirst({
            where: eq(schema.subscriptions.paypalSubscriptionId, subId),
          });
          existingSub = row ? { userId: row.userId, variantName: row.variantName } : undefined;
        }

        const newStatus = mapStatus(
          eventType === 'BILLING.SUBSCRIPTION.SUSPENDED' ? 'SUSPENDED'
            : eventType === 'BILLING.SUBSCRIPTION.EXPIRED' ? 'EXPIRED'
            : eventStatus || 'CANCELLED'
        );

        await db
          .update(schema.subscriptions)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(schema.subscriptions.paypalSubscriptionId, subId));

        if (eventType === 'BILLING.SUBSCRIPTION.PAYMENT_FAILED') {
          console.error('[PayPal Webhook] Payment failed:', { subId, planId });
        }

        // 异步写入订阅事件流水（取消/过期）
        if (isCancelOrExpire && existingSub) {
          trackSubscriptionEvent({
            userId: existingSub.userId || '',
            eventType: eventType === 'BILLING.SUBSCRIPTION.CANCELLED' ? 'cancelled' : 'expired',
            plan: existingSub.variantName as PlanVariant,
            paypalSubscriptionId: subId,
          });
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.UPDATED': {
        // 查询已有订阅以获取 userId 和旧方案（用于升降级判断）
        const oldRow = await db.query.subscriptions.findFirst({
          where: eq(schema.subscriptions.paypalSubscriptionId, subId),
        });
        const userId = oldRow?.userId || '';
        const oldVariant = oldRow?.variantName as PlanVariant | undefined;

        const updates: Record<string, unknown> = {};

        let newVariant: string | null = null;
        if (planId) {
          updates.paypalPlanId = planId;
          newVariant = getVariantName(planId);
          if (newVariant) updates.variantName = newVariant;
        }

        if (eventStatus) {
          updates.status = mapStatus(eventStatus);
        }
        if (nextBilling) updates.currentPeriodEnd = new Date(nextBilling);
        updates.updatedAt = new Date();

        await db
          .update(schema.subscriptions)
          .set(updates)
          .where(eq(schema.subscriptions.paypalSubscriptionId, subId));

        // 异步写入订阅事件流水（方案变更：升级或降级）
        if (newVariant && oldVariant && newVariant !== oldVariant) {
          const direction = getPlanChangeDirection(oldVariant, newVariant as PlanVariant);
          if (direction) {
            trackSubscriptionEvent({
              userId,
              eventType: direction,
              plan: newVariant as PlanVariant,
              previousPlan: oldVariant,
              paypalSubscriptionId: subId,
            });
          }
        }
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('PayPal webhook processing failed:', err);
    return Response.json({ error: 'Processing failed' }, { status: 400 });
  }

  return Response.json({ received: true });
}

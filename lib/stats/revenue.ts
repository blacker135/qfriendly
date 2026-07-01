// lib/stats/revenue.ts
// 收入分析引擎 — 事件采集 + 查询
// 订阅事件采集和 MRR 缓存写入

import { db } from '@/lib/db';
import { subscriptionEvents } from '@/lib/db/schema';

/** 订阅事件类型 */
export type SubscriptionEventType =
  | 'created'
  | 'renewed'
  | 'upgraded'
  | 'downgraded'
  | 'cancelled'
  | 'expired'
  | 'reactivated';

/** 方案标识 */
export type PlanVariant = 'start' | 'pro' | 'ultra' | 'admin';

/** 方案等级排序（用于升级/降级判断） */
const PLAN_RANK: Record<PlanVariant, number> = {
  start: 1,
  pro: 2,
  ultra: 3,
  admin: 4,
};

/**
 * 判断两个方案的升降级关系
 * @returns 'upgraded' | 'downgraded' | null（相同方案）
 */
export function getPlanChangeDirection(
  oldPlan: PlanVariant,
  newPlan: PlanVariant
): 'upgraded' | 'downgraded' | null {
  const oldRank = PLAN_RANK[oldPlan] ?? 0;
  const newRank = PLAN_RANK[newPlan] ?? 0;
  if (newRank > oldRank) return 'upgraded';
  if (newRank < oldRank) return 'downgraded';
  return null;
}

/**
 * 根据 PayPal Plan ID 推断计费周期
 * 通过对比环境变量中的月度/年度 Plan ID 来判断
 * @param planId - PayPal Plan ID
 * @returns 'monthly' | 'yearly' | undefined
 */
export function getBillingPeriod(planId: string): 'monthly' | 'yearly' | undefined {
  const monthlyPlans = [
    process.env.PAYPAL_PLAN_START_MONTHLY,
    process.env.PAYPAL_PLAN_PRO_MONTHLY,
    process.env.PAYPAL_PLAN_ULTRA_MONTHLY,
  ];
  const yearlyPlans = [
    process.env.PAYPAL_PLAN_START_YEARLY,
    process.env.PAYPAL_PLAN_PRO_YEARLY,
    process.env.PAYPAL_PLAN_ULTRA_YEARLY,
  ];
  if (monthlyPlans.includes(planId)) return 'monthly';
  if (yearlyPlans.includes(planId)) return 'yearly';
  return undefined;
}

/**
 * 记录订阅事件（异步 fire-and-forget，不阻塞 webhook 响应）
 * 在 PayPal Webhook 处理中调用，写入 subscription_events 表
 */
export function trackSubscriptionEvent(params: {
  userId: string;
  eventType: SubscriptionEventType;
  plan: PlanVariant;
  billingPeriod?: 'monthly' | 'yearly';
  amount?: number;
  paypalSubscriptionId: string;
  previousPlan?: PlanVariant;
}): void {
  db.insert(subscriptionEvents)
    .values({
      userId: params.userId,
      eventType: params.eventType,
      plan: params.plan,
      billingPeriod: params.billingPeriod ?? null,
      amount: params.amount?.toString() ?? null,
      paypalSubscriptionId: params.paypalSubscriptionId,
      previousPlan: params.previousPlan ?? null,
    })
    .execute()
    .catch((err) => {
      console.error('[RevenueTracker] 订阅事件记录失败:', params.eventType, err);
    });
}

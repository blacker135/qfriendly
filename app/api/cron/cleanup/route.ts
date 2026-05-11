// app/api/cron/cleanup/route.ts
// GET /api/cron/cleanup — Vercel Cron Job 清理过期消息
// 根据用户订阅等级决定消息保留期限：
//   - Starter 用户: 删除 7 天前的消息
//   - Pro 用户: 删除 30 天前的消息
//   - Ultra 用户: 不清理
//   - 未订阅用户: 删除 7 天前的消息

import { db, schema } from '@/lib/db';
import { eq, and, lte, inArray, notInArray } from 'drizzle-orm';

/** Vercel Cron Job 验证密钥，通过 Authorization header 传递 */
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/cleanup
 * Vercel Cron Job 入口，每天凌晨 3:00 自动调用。
 * 验证 CRON_SECRET 后执行分层清理策略。
 */
export async function GET(request: Request) {
  // Vercel Cron Jobs 通过 Authorization header 传递 secret
  const authHeader = request.headers.get('Authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  try {
    // 查询所有活跃订阅用户
    const activeSubs = await db
      .select({
        userId: schema.subscriptions.userId,
        variantName: schema.subscriptions.variantName,
      })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.status, 'active'));

    // 按订阅等级分类用户
    const starterUserIds = activeSubs
      .filter((s) => s.variantName === 'starter')
      .map((s) => s.userId);
    const proUserIds = activeSubs
      .filter((s) => s.variantName === 'pro')
      .map((s) => s.userId);
    // Ultra 用户不清理，无需收集

    let cleanedStarter = 0;
    let cleanedPro = 0;
    let cleanedUnsub = 0;

    // Starter: 删除 7 天前的消息
    if (starterUserIds.length > 0) {
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const convs = await db
        .select({ id: schema.conversations.id })
        .from(schema.conversations)
        .where(inArray(schema.conversations.userId, starterUserIds));

      for (const conv of convs) {
        const result = await db
          .delete(schema.messages)
          .where(
            and(
              eq(schema.messages.conversationId, conv.id),
              lte(schema.messages.createdAt, cutoff),
            ),
          );
        cleanedStarter += (result.rowCount || 0);
      }
    }

    // Pro: 删除 30 天前的消息
    if (proUserIds.length > 0) {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const convs = await db
        .select({ id: schema.conversations.id })
        .from(schema.conversations)
        .where(inArray(schema.conversations.userId, proUserIds));

      for (const conv of convs) {
        const result = await db
          .delete(schema.messages)
          .where(
            and(
              eq(schema.messages.conversationId, conv.id),
              lte(schema.messages.createdAt, cutoff),
            ),
          );
        cleanedPro += (result.rowCount || 0);
      }
    }

    // 未订阅用户: 删除 7 天前的消息
    const allSubUserIds = activeSubs.map((s) => s.userId);
    const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    if (allSubUserIds.length > 0) {
      // 排除所有有活跃订阅的用户（包括 Ultra，因为 Ultra 不清理）
      const convs = await db
        .select({ id: schema.conversations.id })
        .from(schema.conversations)
        .where(notInArray(schema.conversations.userId, allSubUserIds));

      for (const conv of convs) {
        const result = await db
          .delete(schema.messages)
          .where(
            and(
              eq(schema.messages.conversationId, conv.id),
              lte(schema.messages.createdAt, cutoff),
            ),
          );
        cleanedUnsub += (result.rowCount || 0);
      }
    } else {
      // 没有活跃订阅用户时，所有用户都是未订阅用户
      const convs = await db
        .select({ id: schema.conversations.id })
        .from(schema.conversations);

      for (const conv of convs) {
        const result = await db
          .delete(schema.messages)
          .where(
            and(
              eq(schema.messages.conversationId, conv.id),
              lte(schema.messages.createdAt, cutoff),
            ),
          );
        cleanedUnsub += (result.rowCount || 0);
      }
    }

    return Response.json({
      cleaned: true,
      starterMessagesDeleted: cleanedStarter,
      proMessagesDeleted: cleanedPro,
      unsubMessagesDeleted: cleanedUnsub,
    });
  } catch (err) {
    console.error('Cleanup cron failed:', err);
    return Response.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}

// app/api/cron/daily-stats/route.ts
// GET /api/cron/daily-stats — Vercel Cron Job 每日统计聚合
// 在每天 0:05 自动调用，执行以下任务：
//   1. 每日统计聚合（DAU/消息/PV/UV/首页曝光/支付/留存）
//   2. MRR 快照物化
//   3. 会话聚合写入 analytics_daily_stats
//   4. 会话清理（关闭超时会话）
//   5. 每月 1 日额外执行月度聚合

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

/** Vercel Cron Job 验证密钥，通过 Authorization header 传递 */
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/daily-stats
 * Vercel Cron Job 入口，每天 0:05 自动调用。
 * 验证 CRON_SECRET 后执行统计聚合流程。
 */
export async function GET(request: Request) {
  // Vercel Cron Jobs 通过 Authorization header 传递 secret
  const authHeader = request.headers.get('Authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 计算昨天的日期字符串（YYYY-MM-DD）
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  try {
    // 1. 每日统计聚合（DAU/消息/PV/UV/首页曝光/支付/留存）
    const { processDailyStats } = await import('@/lib/stats/processor');
    await processDailyStats(yesterday);

    // 2. MRR 快照物化
    // 按各订阅方案分别聚合 MRR，同时输出 'all' 汇总行
    await db.execute(sql`
      INSERT INTO mrr_snapshots (date, plan, mrr_value, subscriber_count, new_count, churn_count)
      SELECT
        ${yesterday}::date,
        plan,
        COALESCE(SUM(CASE WHEN billing_period = 'monthly' THEN amount ELSE 0 END), 0) as mrr,
        COUNT(DISTINCT user_id)::int as subs,
        COUNT(DISTINCT CASE WHEN event_type = 'created' THEN user_id END)::int as new_subs,
        COUNT(DISTINCT CASE WHEN event_type IN ('cancelled','expired') THEN user_id END)::int as churned
      FROM subscription_events
      WHERE plan IN ('start','pro','ultra','admin')
      GROUP BY plan
      UNION ALL
      SELECT
        ${yesterday}::date,
        'all',
        COALESCE(SUM(CASE WHEN billing_period = 'monthly' THEN amount ELSE 0 END), 0),
        COUNT(DISTINCT user_id)::int,
        COUNT(DISTINCT CASE WHEN event_type = 'created' THEN user_id END)::int,
        COUNT(DISTINCT CASE WHEN event_type IN ('cancelled','expired') THEN user_id END)::int
      FROM subscription_events
      WHERE plan IN ('start','pro','ultra','admin')
      ON CONFLICT (date, plan) DO UPDATE SET
        mrr_value = EXCLUDED.mrr_value,
        subscriber_count = EXCLUDED.subscriber_count,
        new_count = EXCLUDED.new_count,
        churn_count = EXCLUDED.churn_count
    `);

    // 3. 会话聚合（每日会话数写入 analytics_daily_stats）
    await db.execute(sql`
      INSERT INTO analytics_daily_stats (date, metric_key, metric_value)
      SELECT ${yesterday}::date, 'session_count', COUNT(*)::int::text
      FROM sessions WHERE started_at::date = ${yesterday}::date
      ON CONFLICT (date, metric_key) DO UPDATE SET metric_value = EXCLUDED.metric_value
    `);

    // 4. 会话清理：关闭超时会话，计算时长
    const cleanupResult = await db.execute(sql`
      UPDATE sessions
      SET
        ended_at = last_heartbeat_at + INTERVAL '30 minutes',
        duration_seconds = EXTRACT(EPOCH FROM (last_heartbeat_at - started_at))::int
      WHERE ended_at IS NULL
        AND last_heartbeat_at < NOW() - INTERVAL '30 minutes'
    `);

    // 5. 月初触发月度聚合
    const today = new Date();
    if (today.getDate() === 1) {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const yearMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
      const { processMonthlyAggregation } = await import('@/lib/stats/processor');
      await processMonthlyAggregation(yearMonth);
    }

    return Response.json({ ok: true, date: yesterday, sessionsCleaned: cleanupResult.rowCount ?? 0 });
  } catch (error) {
    console.error('[DailyStats] Cron 执行失败:', error);
    return Response.json({ error: '每日聚合失败' }, { status: 500 });
  }
}

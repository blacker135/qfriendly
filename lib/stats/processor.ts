// lib/stats/processor.ts
// 数据统计引擎 — 聚合处理器
// 将原始事件按日/月聚合为统计指标，供查询层使用

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { analyticsEvents, analyticsDailyStats, analyticsMonthlyStats, analyticsRetention } from './schema';

/**
 * 计算 DAU（当日至少发过 1 条消息的唯一用户数）
 * 写入 analytics_daily_stats，metric_key = 'dau'
 */
export async function processDAU(dateStr: string): Promise<number> {
  const result = await db
    .execute<{ count: number }>(
      sql`SELECT COUNT(DISTINCT user_id)::int as count
          FROM ${analyticsEvents}
          WHERE event_type = 'message_sent'
            AND created_at::date = ${dateStr}::date`
    );

  const count = result.rows[0]?.count ?? 0;

  await db
    .insert(analyticsDailyStats)
    .values({ date: dateStr, metricKey: 'dau', metricValue: String(count) })
    .onConflictDoUpdate({
      target: [analyticsDailyStats.date, analyticsDailyStats.metricKey],
      set: { metricValue: String(count) },
    });

  return count;
}

/**
 * 计算消息总数（按天）
 */
export async function processMessageCount(dateStr: string): Promise<number> {
  const result = await db
    .execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count
          FROM ${analyticsEvents}
          WHERE event_type = 'message_sent'
            AND created_at::date = ${dateStr}::date`
    );

  const count = result.rows[0]?.count ?? 0;

  await db
    .insert(analyticsDailyStats)
    .values({ date: dateStr, metricKey: 'message_count', metricValue: String(count) })
    .onConflictDoUpdate({
      target: [analyticsDailyStats.date, analyticsDailyStats.metricKey],
      set: { metricValue: String(count) },
    });

  return count;
}

/**
 * 计算 PV（页面访问次数）
 */
export async function processPV(dateStr: string): Promise<number> {
  const result = await db
    .execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count
          FROM ${analyticsEvents}
          WHERE event_type = 'page_view'
            AND created_at::date = ${dateStr}::date`
    );

  const count = result.rows[0]?.count ?? 0;

  await db
    .insert(analyticsDailyStats)
    .values({ date: dateStr, metricKey: 'pv', metricValue: String(count) })
    .onConflictDoUpdate({
      target: [analyticsDailyStats.date, analyticsDailyStats.metricKey],
      set: { metricValue: String(count) },
    });

  return count;
}

/**
 * 计算 UV（独立访客数）
 */
export async function processUV(dateStr: string): Promise<number> {
  const result = await db
    .execute<{ count: number }>(
      sql`SELECT COUNT(DISTINCT COALESCE(user_id, 'anon'))::int as count
          FROM ${analyticsEvents}
          WHERE event_type = 'page_view'
            AND created_at::date = ${dateStr}::date`
    );

  const count = result.rows[0]?.count ?? 0;

  await db
    .insert(analyticsDailyStats)
    .values({ date: dateStr, metricKey: 'uv', metricValue: String(count) })
    .onConflictDoUpdate({
      target: [analyticsDailyStats.date, analyticsDailyStats.metricKey],
      set: { metricValue: String(count) },
    });

  return count;
}

/**
 * 计算首页曝光量
 */
export async function processHomepageExposure(dateStr: string): Promise<number> {
  const result = await db
    .execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count
          FROM ${analyticsEvents}
          WHERE event_type = 'page_view'
            AND payload->>'path' = '/'
            AND created_at::date = ${dateStr}::date`
    );

  const count = result.rows[0]?.count ?? 0;

  await db
    .insert(analyticsDailyStats)
    .values({ date: dateStr, metricKey: 'homepage_exposure', metricValue: String(count) })
    .onConflictDoUpdate({
      target: [analyticsDailyStats.date, analyticsDailyStats.metricKey],
      set: { metricValue: String(count) },
    });

  return count;
}

/**
 * 计算日付费总额
 */
export async function processPaymentTotal(dateStr: string): Promise<number> {
  const result = await db
    .execute<{ total: number }>(
      sql`SELECT COALESCE(SUM((payload->>'amount')::numeric), 0) as total
          FROM ${analyticsEvents}
          WHERE event_type = 'payment_completed'
            AND created_at::date = ${dateStr}::date`
    );

  const total = result.rows[0]?.total ?? 0;

  await db
    .insert(analyticsDailyStats)
    .values({ date: dateStr, metricKey: 'payment_total', metricValue: String(total) })
    .onConflictDoUpdate({
      target: [analyticsDailyStats.date, analyticsDailyStats.metricKey],
      set: { metricValue: String(total) },
    });

  return total;
}

/**
 * 计算日付费率 = 当日首次付费用户数 / DAU × 100
 */
export async function processPaymentRate(dateStr: string, dau: number): Promise<number> {
  const result = await db
    .execute<{ count: number }>(
      sql`SELECT COUNT(DISTINCT user_id)::int as count
          FROM ${analyticsEvents}
          WHERE event_type = 'payment_completed'
            AND created_at::date = ${dateStr}::date
            AND user_id NOT IN (
              SELECT DISTINCT user_id FROM ${analyticsEvents}
              WHERE event_type = 'payment_completed'
                AND created_at::date < ${dateStr}::date
            )`
    );

  const firstPayers = result.rows[0]?.count ?? 0;
  const rate = dau > 0 ? (firstPayers / dau) * 100 : 0;

  await db
    .insert(analyticsDailyStats)
    .values({ date: dateStr, metricKey: 'payment_rate', metricValue: String(rate) })
    .onConflictDoUpdate({
      target: [analyticsDailyStats.date, analyticsDailyStats.metricKey],
      set: { metricValue: String(rate) },
    });

  return rate;
}

/**
 * 计算留存率 (D1/D7/D30)
 * cohortDate: 队列日期（用户首次活跃日期）
 * dayN: 1 / 7 / 30
 */
export async function processRetention(cohortDate: string, dayN: number): Promise<number> {
  const result = await db
    .execute<{ rate: number }>(
      sql`
        WITH cohort AS (
          SELECT DISTINCT user_id
          FROM ${analyticsEvents}
          WHERE event_type = 'message_sent'
            AND created_at::date = ${cohortDate}::date
        ),
        retained AS (
          SELECT DISTINCT e.user_id
          FROM ${analyticsEvents} e
          INNER JOIN cohort c ON e.user_id = c.user_id
          WHERE e.event_type = 'message_sent'
            AND e.created_at::date = (${cohortDate}::date + ${dayN}::int)
        )
        SELECT
          CASE WHEN (SELECT COUNT(*) FROM cohort) > 0
            THEN (SELECT COUNT(*)::numeric FROM retained) / (SELECT COUNT(*)::numeric FROM cohort) * 100
            ELSE 0
          END as rate
      `
    );

  const rate = result.rows[0]?.rate ?? 0;

  await db
    .insert(analyticsRetention)
    .values({ cohortDate, dayN, retentionRate: String(rate) })
    .onConflictDoUpdate({
      target: [analyticsRetention.cohortDate, analyticsRetention.dayN],
      set: { retentionRate: String(rate) },
    });

  return rate;
}

/**
 * 按月聚合：将当月所有日的 metric 汇总写入月表
 */
export async function processMonthlyAggregation(yearMonth: string): Promise<void> {
  const startDate = `${yearMonth}-01`;

  const metrics = ['dau', 'message_count', 'pv', 'uv', 'homepage_exposure', 'payment_total', 'payment_rate'];

  for (const key of metrics) {
    const result = await db
      .execute<{ total: number }>(
        sql`SELECT COALESCE(SUM(metric_value::numeric), 0) as total
            FROM ${analyticsDailyStats}
            WHERE metric_key = ${key}
              AND date >= ${startDate}::date
              AND date < (${startDate}::date + INTERVAL '1 month')`
      );

    await db
      .insert(analyticsMonthlyStats)
      .values({ yearMonth, metricKey: key, metricValue: String(result.rows[0]?.total ?? 0) })
      .onConflictDoUpdate({
        target: [analyticsMonthlyStats.yearMonth, analyticsMonthlyStats.metricKey],
        set: { metricValue: String(result.rows[0]?.total ?? 0) },
      });
  }
}

/**
 * 批量处理每日聚合（供定时任务调用）
 */
export async function processDailyStats(dateStr: string): Promise<void> {
  const dau = await processDAU(dateStr);
  await processMessageCount(dateStr);
  await processPV(dateStr);
  await processUV(dateStr);
  await processHomepageExposure(dateStr);
  await processPaymentTotal(dateStr);
  await processPaymentRate(dateStr, dau);
}

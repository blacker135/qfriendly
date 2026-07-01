// app/api/admin/traffic/detail/route.ts
// GET /api/admin/traffic/detail — 流量详情 API
// 返回 PV/UV/首页曝光趋势 + 页面排行 + 设备/国家/来源分布
// 支持 ?start=YYYY-MM-DD&end=YYYY-MM-DD 参数

import { getAdminUserId } from '@/lib/admin/guard';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/traffic/detail
 * 查询指定日期范围内的流量详情数据
 */
export async function GET(req: NextRequest) {
  // 管理员权限校验
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const today = new Date().toISOString().slice(0, 10);
  const start = searchParams.get('start') || today;
  const end = searchParams.get('end') || today;

  try {
    // 并行查询所有指标，提升响应速度
    const [
      pvTrend,
      uvTrend,
      homepageExposureTrend,
      topPages,
      deviceDistribution,
      countryDistribution,
      referrerDistribution,
    ] = await Promise.all([
      queryPVTrend(start, end),
      queryUVTrend(start, end),
      queryHomepageExposureTrend(start, end),
      queryTopPages(start, end),
      queryDeviceDistribution(start, end),
      queryCountryDistribution(start, end),
      queryReferrerDistribution(start, end),
    ]);

    return NextResponse.json({
      pvTrend,
      uvTrend,
      homepageExposureTrend,
      topPages,
      deviceDistribution,
      countryDistribution,
      referrerDistribution,
    });
  } catch (error) {
    console.error('[AdminTrafficDetail] 获取流量详情失败:', error);
    return NextResponse.json(
      { error: '获取流量详情失败' },
      { status: 500 }
    );
  }
}

/**
 * 查询 PV（页面访问量）趋势
 * 从 analytics_daily_stats 表读取 pv 指标
 */
async function queryPVTrend(
  start: string,
  end: string
): Promise<{ date: string; value: number }[]> {
  const result = await db.execute<{ date: string; value: number }>(
    sql`SELECT date::text, metric_value::numeric as value
        FROM analytics_daily_stats
        WHERE metric_key = 'pv'
          AND date >= ${start}::date
          AND date <= ${end}::date
        ORDER BY date`
  );
  return result.rows.map((r) => ({
    date: r.date,
    value: Number(r.value),
  }));
}

/**
 * 查询 UV（独立访客）趋势
 * 从 analytics_daily_stats 表读取 uv 指标
 */
async function queryUVTrend(
  start: string,
  end: string
): Promise<{ date: string; value: number }[]> {
  const result = await db.execute<{ date: string; value: number }>(
    sql`SELECT date::text, metric_value::numeric as value
        FROM analytics_daily_stats
        WHERE metric_key = 'uv'
          AND date >= ${start}::date
          AND date <= ${end}::date
        ORDER BY date`
  );
  return result.rows.map((r) => ({
    date: r.date,
    value: Number(r.value),
  }));
}

/**
 * 查询首页曝光趋势
 * 从 analytics_daily_stats 表读取 homepage_exposure 指标
 */
async function queryHomepageExposureTrend(
  start: string,
  end: string
): Promise<{ date: string; value: number }[]> {
  const result = await db.execute<{ date: string; value: number }>(
    sql`SELECT date::text, metric_value::numeric as value
        FROM analytics_daily_stats
        WHERE metric_key = 'homepage_exposure'
          AND date >= ${start}::date
          AND date <= ${end}::date
        ORDER BY date`
  );
  return result.rows.map((r) => ({
    date: r.date,
    value: Number(r.value),
  }));
}

/**
 * 查询页面排行 Top 10
 * 从 analytics_events 表中聚合 page_view 事件的 payload.path
 */
async function queryTopPages(
  start: string,
  end: string
): Promise<{ path: string; count: number }[]> {
  const result = await db.execute<{ path: string; count: number }>(
    sql`SELECT
          COALESCE(payload->>'path', '/') as path,
          COUNT(*)::int as count
        FROM analytics_events
        WHERE event_type = 'page_view'
          AND created_at::date >= ${start}::date
          AND created_at::date <= ${end}::date
        GROUP BY payload->>'path'
        ORDER BY count DESC
        LIMIT 10`
  );
  return result.rows.map((r) => ({
    path: r.path,
    count: Number(r.count),
  }));
}

/**
 * 查询设备分布
 * 从 sessions 表中按 device_type 分组统计
 */
async function queryDeviceDistribution(
  start: string,
  end: string
): Promise<{ type: string; count: number }[]> {
  const result = await db.execute<{ type: string; count: number }>(
    sql`SELECT
          COALESCE(device_type, 'unknown') as type,
          COUNT(*)::int as count
        FROM sessions
        WHERE started_at::date >= ${start}::date
          AND started_at::date <= ${end}::date
        GROUP BY device_type
        ORDER BY count DESC`
  );
  return result.rows.map((r) => ({
    type: r.type,
    count: Number(r.count),
  }));
}

/**
 * 查询国家分布 Top 10
 * 从 sessions 表中按 country 分组统计
 */
async function queryCountryDistribution(
  start: string,
  end: string
): Promise<{ country: string; count: number }[]> {
  const result = await db.execute<{ country: string; count: number }>(
    sql`SELECT
          COALESCE(country, 'unknown') as country,
          COUNT(*)::int as count
        FROM sessions
        WHERE started_at::date >= ${start}::date
          AND started_at::date <= ${end}::date
        GROUP BY country
        ORDER BY count DESC
        LIMIT 10`
  );
  return result.rows.map((r) => ({
    country: r.country,
    count: Number(r.count),
  }));
}

/**
 * 查询来源分布
 * 从 analytics_events 表中聚合 page_view 事件的 payload.referrer
 */
async function queryReferrerDistribution(
  start: string,
  end: string
): Promise<{ source: string; count: number }[]> {
  const result = await db.execute<{ source: string; count: number }>(
    sql`SELECT
          CASE
            WHEN payload->>'referrer' IS NULL OR payload->>'referrer' = '' THEN 'direct'
            WHEN payload->>'referrer' LIKE '%google.%' THEN 'Google'
            WHEN payload->>'referrer' LIKE '%baidu.%' THEN 'Baidu'
            WHEN payload->>'referrer' LIKE '%bing.%' THEN 'Bing'
            WHEN payload->>'referrer' LIKE '%duckduckgo.%' THEN 'DuckDuckGo'
            WHEN payload->>'referrer' LIKE '%github.%' THEN 'GitHub'
            ELSE 'other'
          END as source,
          COUNT(*)::int as count
        FROM analytics_events
        WHERE event_type = 'page_view'
          AND created_at::date >= ${start}::date
          AND created_at::date <= ${end}::date
        GROUP BY source
        ORDER BY count DESC`
  );
  return result.rows.map((r) => ({
    source: r.source,
    count: Number(r.count),
  }));
}

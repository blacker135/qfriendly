// app/api/admin/reports/generate-pdf/route.ts
// POST /api/admin/reports/generate-pdf — 报表数据生成 API
// 接收 { type, start?, end? }，返回 JSON 报表摘要数据供前端 PDF 生成使用

import { getAdminUserId } from '@/lib/admin/guard';
import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

/** 日期范围 */
interface DateRange {
  start: string;
  end: string;
}

/** 请求体 */
interface GeneratePdfRequest {
  type: 'weekly' | 'monthly' | 'custom';
  start?: string; // YYYY-MM-DD (custom 时必填)
  end?: string;   // YYYY-MM-DD (custom 时必填)
}

/** 概览摘要 */
interface OverviewSummary {
  mrr: number;
  arr: number;
  dau: number;
  payingUsers: number;
  churnRate: number;
}

/** 趋势数据点 */
interface TrendPoint {
  date: string;
  value: number;
}

/** 趋势数据 */
interface Trends {
  mrr: TrendPoint[];
  dau: TrendPoint[];
  messages: TrendPoint[];
}

/** 关键变化（与上一周期对比） */
interface PeriodChange {
  mrrChange: number;          // 百分比
  dauChange: number;
  messagesChange: number;
  payingUsersChange: number;
  churnRateChange: number;    // 百分点
}

/** PDF 报表数据 */
interface ReportData {
  title: string;
  periodLabel: string;
  generatedAt: string;
  overview: OverviewSummary;
  trends: Trends;
  changes: PeriodChange;
  topExperts: { name: string; usageCount: number }[];
  planDistribution: { plan: string; count: number; mrr: number }[];
}

/**
 * 根据 type 计算查询日期范围
 */
function getDateRange(type: string, start?: string, end?: string): DateRange {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (type) {
    case 'weekly': {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return { start: fmt(weekAgo), end: fmt(today) };
    }
    case 'monthly': {
      const monthAgo = new Date(today);
      monthAgo.setDate(today.getDate() - 30);
      return { start: fmt(monthAgo), end: fmt(today) };
    }
    case 'custom':
    default:
      return { start: start || fmt(new Date(today.getFullYear(), today.getMonth(), 1)), end: end || fmt(today) };
  }
}

/**
 * 计算上一周期的日期范围（与当前周期等长）
 */
function getPreviousDateRange(current: DateRange): DateRange {
  const start = new Date(current.start);
  const end = new Date(current.end);
  const days = Math.ceil((end.getTime() - start.getTime()) / 86400000);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { start: fmt(prevStart), end: fmt(prevEnd) };
}

/** MRR 查询 */
async function fetchMRR(): Promise<number> {
  const r = await db.execute<{ amount: number }>(
    sql`SELECT COALESCE(SUM(mrr), 0)::numeric as amount FROM mrr_snapshots
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM mrr_snapshots)`
  );
  return Number(r.rows[0]?.amount ?? 0);
}

/** DAU 查询（指定日期） */
async function fetchDAU(date: string): Promise<number> {
  const r = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT user_id)::int as count FROM sessions
        WHERE created_at::date = ${date}::date`
  );
  return r.rows[0]?.count ?? 0;
}

/** 付费用户数 */
async function fetchPayingUsers(): Promise<number> {
  const r = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int as count FROM subscriptions WHERE status = 'active' AND variant_name != 'admin'`
  );
  return r.rows[0]?.count ?? 0;
}

/** 流失率（期内流失 / 期初活跃付费用户） */
async function fetchChurnRate(range: DateRange): Promise<number> {
  const [churned, startActive] = await Promise.all([
    db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count FROM subscription_events
          WHERE event_type IN ('subscription_cancelled', 'subscription_expired')
            AND event_date >= ${range.start}::date AND event_date <= ${range.end}::date`
    ),
    db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count FROM subscriptions
          WHERE status = 'active' AND variant_name != 'admin'
            AND created_at <= ${range.start}::date`
    ),
  ]);
  const c = churned.rows[0]?.count ?? 0;
  const a = startActive.rows[0]?.count ?? 0;
  return a > 0 ? c / a * 100 : 0;
}

/** MRR 趋势 */
async function fetchMRRTrend(range: DateRange): Promise<TrendPoint[]> {
  const r = await db.execute<{ date: string; mrr: number }>(
    sql`SELECT snapshot_date::text as date, COALESCE(SUM(mrr), 0)::numeric as mrr
        FROM mrr_snapshots
        WHERE snapshot_date >= ${range.start}::date AND snapshot_date <= ${range.end}::date
        GROUP BY snapshot_date ORDER BY snapshot_date`
  );
  return r.rows.map((row) => ({ date: row.date, value: Number(row.mrr) }));
}

/** DAU 趋势 */
async function fetchDAUTrend(range: DateRange): Promise<TrendPoint[]> {
  const r = await db.execute<{ date: string; count: number }>(
    sql`SELECT created_at::date::text as date, COUNT(DISTINCT user_id)::int as count
        FROM sessions
        WHERE created_at >= ${range.start}::timestamp AND created_at <= ${range.end}::timestamp + interval '1 day'
        GROUP BY created_at::date ORDER BY created_at::date`
  );
  return r.rows.map((row) => ({ date: row.date, value: row.count }));
}

/** 消息趋势 */
async function fetchMessageTrend(range: DateRange): Promise<TrendPoint[]> {
  const r = await db.execute<{ date: string; count: number }>(
    sql`SELECT created_at::date::text as date, COUNT(*)::int as count
        FROM messages
        WHERE created_at >= ${range.start}::timestamp AND created_at <= ${range.end}::timestamp + interval '1 day'
        GROUP BY created_at::date ORDER BY created_at::date`
  );
  return r.rows.map((row) => ({ date: row.date, value: row.count }));
}

/** 期内消息总数 */
async function fetchMessageCount(range: DateRange): Promise<number> {
  const r = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int as count FROM messages
        WHERE created_at >= ${range.start}::timestamp AND created_at <= ${range.end}::timestamp + interval '1 day'`
  );
  return r.rows[0]?.count ?? 0;
}

/** 专家使用分布 */
async function fetchTopExperts(range: DateRange): Promise<{ name: string; usageCount: number }[]> {
  const r = await db.execute<{ expert: string; count: number }>(
    sql`SELECT expert, COUNT(*)::int as count FROM conversations
        WHERE created_at >= ${range.start}::timestamp AND created_at <= ${range.end}::timestamp + interval '1 day'
        GROUP BY expert ORDER BY count DESC LIMIT 5`
  );
  return r.rows.map((row) => ({ name: row.expert, usageCount: row.count }));
}

/** 订阅方案分布 */
async function fetchPlanDistribution(): Promise<{ plan: string; count: number; mrr: number }[]> {
  const r = await db.execute<{ plan: string; count: number; mrr: number }>(
    sql`SELECT variant_name as plan, COUNT(*)::int as count,
            COALESCE(SUM((payload->>'amount')::numeric), 0)::numeric as mrr
        FROM subscriptions s
        LEFT JOIN analytics_events e ON e.event_type = 'payment_completed'
          AND e.payload->>'subscription_id' = s.paypal_subscription_id
        WHERE s.status = 'active' AND s.variant_name != 'admin'
        GROUP BY variant_name ORDER BY mrr DESC`
  );
  return r.rows.map((row) => ({ plan: row.plan, count: row.count, mrr: Number(row.mrr) }));
}

// ====== POST Handler ======

export async function POST(req: NextRequest) {
  // Admin 鉴权
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  try {
    const body: GeneratePdfRequest = await req.json();
    const { type = 'monthly', start, end } = body;

    if (!['weekly', 'monthly', 'custom'].includes(type)) {
      return NextResponse.json({ error: 'type 必须为 weekly/monthly/custom' }, { status: 400 });
    }

    const range = getDateRange(type, start, end);
    const prevRange = getPreviousDateRange(range);

    // 并行查询所有数据
    const [
      mrr, dau, payingUsers, churnRate,
      mrrTrend, dauTrend, messageTrend, messageCount,
      topExperts, planDistribution,
      // 上一周期对比数据
      prevMRR, prevDAU, prevPayingUsers, prevChurnRate, prevMessageCount,
    ] = await Promise.all([
      fetchMRR(),
      fetchDAU(range.end),
      fetchPayingUsers(),
      fetchChurnRate(range),
      fetchMRRTrend(range),
      fetchDAUTrend(range),
      fetchMessageTrend(range),
      fetchMessageCount(range),
      fetchTopExperts(range),
      fetchPlanDistribution(),
      // 计算上一周期的 ARR (用期初 MRR * 12 近似)
      db.execute<{ amount: number }>(
        sql`SELECT COALESCE(SUM(mrr), 0)::numeric as amount FROM mrr_snapshots
            WHERE snapshot_date <= ${prevRange.end}::date
            ORDER BY snapshot_date DESC LIMIT 1`
      ).then((r) => Number(r.rows[0]?.amount ?? 0)),
      fetchDAU(prevRange.end),
      fetchPayingUsers(),
      fetchChurnRate(prevRange),
      db.execute<{ count: number }>(
        sql`SELECT COUNT(*)::int as count FROM messages
            WHERE created_at >= ${prevRange.start}::timestamp AND created_at <= ${prevRange.end}::timestamp + interval '1 day'`
      ).then((r) => r.rows[0]?.count ?? 0),
    ]);

    // 计算关键变化
    const pctChange = (curr: number, prev: number): number => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const changes: PeriodChange = {
      mrrChange: Math.round(pctChange(mrr, prevMRR) * 10) / 10,
      dauChange: Math.round(pctChange(dau, prevDAU) * 10) / 10,
      messagesChange: Math.round(pctChange(messageCount, prevMessageCount) * 10) / 10,
      payingUsersChange: Math.round(pctChange(payingUsers, prevPayingUsers) * 10) / 10,
      churnRateChange: Math.round((churnRate - prevChurnRate) * 10) / 10, // 百分点差值
    };

    // 周期标签
    const periodLabels: Record<string, string> = {
      weekly: '周报',
      monthly: '月报',
      custom: '自定义周期',
    };

    const reportData: ReportData = {
      title: `QFriendly ${periodLabels[type] || '报表'}`,
      periodLabel: `${range.start} ~ ${range.end}`,
      generatedAt: new Date().toISOString(),
      overview: {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
        dau,
        payingUsers,
        churnRate: Math.round(churnRate * 10) / 10,
      },
      trends: {
        mrr: mrrTrend,
        dau: dauTrend,
        messages: messageTrend,
      },
      changes,
      topExperts,
      planDistribution,
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('[GeneratePDF] 生成报表数据失败:', error);
    return NextResponse.json({ error: '生成报表数据失败' }, { status: 500 });
  }
}

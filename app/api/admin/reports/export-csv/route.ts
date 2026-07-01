// app/api/admin/reports/export-csv/route.ts
// POST /api/admin/reports/export-csv — CSV 数据导出
// 接收 { module, tab, start, end }，根据 module+tab 调用对应查询函数，返回 CSV 文本

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
interface ExportCsvRequest {
  module: string;   // revenue | behavior | dashboard | users | subscriptions
  tab?: string;     // 子 tab (如 overview, funnel, churn, activity, segments, engagement)
  start?: string;   // YYYY-MM-DD
  end?: string;     // YYYY-MM-DD
}

/** CSV 列定义 */
interface CsvColumn {
  key: string;
  label: string;
}

/**
 * 将对象数组转换为 CSV 字符串
 * @param columns 列定义
 * @param rows 数据行
 * @returns CSV 文本
 */
function toCSV(columns: CsvColumn[], rows: Record<string, unknown>[]): string {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const body = rows
    .map((row) =>
      columns.map((c) => `"${String(row[c.key] ?? '').replace(/"/g, '""')}"`).join(','),
    )
    .join('\n');
  return '﻿' + header + '\n' + body; // BOM 确保 Excel 正确识别 UTF-8
}

/** 构建 CSV Response */
function csvResponse(csv: string, filename: string): NextResponse {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

// ====== 各模块查询函数 ======

/** 收入概览 CSV */
async function revenueOverview(range: DateRange): Promise<Record<string, unknown>[]> {
  const [mrr, arr, payingUsers] = await Promise.all([
    db.execute<{ amount: number }>(
      sql`SELECT COALESCE(SUM(mrr), 0)::numeric as amount FROM mrr_snapshots
          WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM mrr_snapshots)`
    ),
    db.execute<{ amount: number }>(
      sql`SELECT COALESCE(SUM(mrr) * 12, 0)::numeric as amount FROM mrr_snapshots
          WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM mrr_snapshots)`
    ),
    db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count FROM subscriptions WHERE status = 'active' AND variant_name != 'admin'`
    ),
  ]);
  return [{
    指标: 'MRR（月经常性收入）', 数值: Number(mrr.rows[0]?.amount ?? 0).toFixed(2), 单位: 'USD',
  }, {
    指标: 'ARR（年经常性收入）', 数值: Number(arr.rows[0]?.amount ?? 0).toFixed(2), 单位: 'USD',
  }, {
    指标: '付费用户数', 数值: payingUsers.rows[0]?.count ?? 0, 单位: '人',
  }];
}

/** 收入趋势 CSV */
async function revenueTrend(range: DateRange): Promise<Record<string, unknown>[]> {
  const result = await db.execute<{ date: string; mrr: number }>(
    sql`SELECT snapshot_date::text as date, COALESCE(SUM(mrr), 0)::numeric as mrr
        FROM mrr_snapshots
        WHERE snapshot_date >= ${range.start}::date AND snapshot_date <= ${range.end}::date
        GROUP BY snapshot_date ORDER BY snapshot_date`
  );
  return result.rows.map((r) => ({
    日期: r.date, MRR: Number(r.mrr).toFixed(2),
  }));
}

/** 转化漏斗 CSV */
async function revenueFunnel(range: DateRange): Promise<Record<string, unknown>[]> {
  const [totalUsers, activeSubs, payingUsers] = await Promise.all([
    db.execute<{ count: number }>(sql`SELECT COUNT(*)::int as count FROM "user"`),
    db.execute<{ count: number }>(
      sql`SELECT COUNT(DISTINCT user_id)::int as count FROM sessions
          WHERE created_at >= ${range.start}::timestamp AND created_at <= ${range.end}::timestamp + interval '1 day'`
    ),
    db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count FROM subscriptions WHERE status = 'active' AND variant_name != 'admin'`
    ),
  ]);
  return [
    { 阶段: '总用户', 人数: totalUsers.rows[0]?.count ?? 0 },
    { 阶段: '活跃用户（期内）', 人数: activeSubs.rows[0]?.count ?? 0 },
    { 阶段: '付费用户', 人数: payingUsers.rows[0]?.count ?? 0 },
  ];
}

/** 流失分析 CSV */
async function revenueChurn(range: DateRange): Promise<Record<string, unknown>[]> {
  const [churned, activePaying] = await Promise.all([
    db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count
          FROM subscription_events
          WHERE event_type IN ('subscription_cancelled', 'subscription_expired')
            AND event_date >= ${range.start}::date AND event_date <= ${range.end}::date`
    ),
    db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count FROM subscriptions WHERE status = 'active' AND variant_name != 'admin'`
    ),
  ]);
  const churnedCount = churned.rows[0]?.count ?? 0;
  const activeCount = activePaying.rows[0]?.count ?? 0;
  const rate = activeCount > 0 ? (churnedCount / activeCount * 100) : 0;
  return [
    { 指标: '流失用户数', 数值: churnedCount, 单位: '人' },
    { 指标: '活跃付费用户', 数值: activeCount, 单位: '人' },
    { 指标: '流失率', 数值: rate.toFixed(2), 单位: '%' },
  ];
}

/** 用户行为活跃度 CSV */
async function behaviorActivity(range: DateRange): Promise<Record<string, unknown>[]> {
  const [dau, wau, mau] = await Promise.all([
    db.execute<{ count: number }>(
      sql`SELECT COUNT(DISTINCT user_id)::int as count FROM sessions
          WHERE created_at::date = (SELECT MAX(created_at::date) FROM sessions)`
    ),
    db.execute<{ count: number }>(
      sql`SELECT COUNT(DISTINCT user_id)::int as count FROM sessions
          WHERE created_at >= CURRENT_DATE - interval '7 days'`
    ),
    db.execute<{ count: number }>(
      sql`SELECT COUNT(DISTINCT user_id)::int as count FROM sessions
          WHERE created_at >= CURRENT_DATE - interval '30 days'`
    ),
  ]);
  return [
    { 指标: 'DAU（日活跃用户）', 数值: dau.rows[0]?.count ?? 0, 单位: '人' },
    { 指标: 'WAU（周活跃用户）', 数值: wau.rows[0]?.count ?? 0, 单位: '人' },
    { 指标: 'MAU（月活跃用户）', 数值: mau.rows[0]?.count ?? 0, 单位: '人' },
    { 指标: 'DAU/MAU 比值', 数值: ((mau.rows[0]?.count ?? 1) > 0 ? ((dau.rows[0]?.count ?? 0) / (mau.rows[0]?.count ?? 1) * 100).toFixed(2) : '0.00'), 单位: '%' },
  ];
}

/** 用户行为消息数据 CSV */
async function behaviorEngagement(range: DateRange): Promise<Record<string, unknown>[]> {
  const [totalMsgs, totalConvs, avgTurns] = await Promise.all([
    db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count FROM messages
          WHERE created_at >= ${range.start}::timestamp AND created_at <= ${range.end}::timestamp + interval '1 day'`
    ),
    db.execute<{ count: number }>(
      sql`SELECT COUNT(*)::int as count FROM conversations
          WHERE created_at >= ${range.start}::timestamp AND created_at <= ${range.end}::timestamp + interval '1 day'`
    ),
    db.execute<{ avg: number }>(
      sql`SELECT COALESCE(AVG(msg_count), 0)::numeric as avg FROM (
            SELECT c.id, COUNT(m.id)::int as msg_count
            FROM conversations c
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE c.created_at >= ${range.start}::timestamp AND c.created_at <= ${range.end}::timestamp + interval '1 day'
            GROUP BY c.id
          ) sub`
    ),
  ]);
  return [
    { 指标: '期内消息总数', 数值: totalMsgs.rows[0]?.count ?? 0, 单位: '条' },
    { 指标: '期内对话总数', 数值: totalConvs.rows[0]?.count ?? 0, 单位: '次' },
    { 指标: '平均每轮对话消息数', 数值: Number(avgTurns.rows[0]?.avg ?? 0).toFixed(1), 单位: '条' },
  ];
}

/** 用户分群 CSV */
async function behaviorSegments(range: DateRange): Promise<Record<string, unknown>[]> {
  const result = await db.execute<{ segment: string; count: number }>(
    sql`WITH user_activity AS (
          SELECT user_id,
                 MAX(created_at::date) as last_active,
                 MIN(created_at::date) as first_active,
                 COUNT(*)::int as session_count
          FROM sessions GROUP BY user_id
        )
        SELECT
          CASE
            WHEN last_active >= CURRENT_DATE - interval '7 days' AND session_count >= 7 THEN '高活跃'
            WHEN last_active >= CURRENT_DATE - interval '14 days' AND session_count >= 3 THEN '中等活跃'
            WHEN last_active >= CURRENT_DATE - interval '30 days' THEN '低活跃'
            WHEN first_active >= CURRENT_DATE - interval '7 days' THEN '新用户'
            ELSE '流失用户'
          END as segment,
          COUNT(*)::int as count
        FROM user_activity GROUP BY segment ORDER BY count DESC`
  );
  return result.rows.map((r) => ({
    用户分群: r.segment, 人数: r.count,
  }));
}

/** 仪表盘汇总 CSV */
async function dashboardSummary(_range: DateRange): Promise<Record<string, unknown>[]> {
  const [totalUsers, activeSubs, totalMsgs, totalRevenue] = await Promise.all([
    db.execute<{ count: number }>(sql`SELECT COUNT(*)::int as count FROM "user"`),
    db.execute<{ count: number }>(sql`SELECT COUNT(*)::int as count FROM subscriptions WHERE status = 'active'`),
    db.execute<{ count: number }>(sql`SELECT COUNT(*)::int as count FROM messages`),
    db.execute<{ total: number }>(
      sql`SELECT COALESCE(SUM((payload->>'amount')::numeric), 0) as total
          FROM analytics_events WHERE event_type = 'payment_completed'`
    ),
  ]);
  return [
    { 指标: '用户总数', 数值: totalUsers.rows[0]?.count ?? 0, 单位: '人' },
    { 指标: '活跃订阅', 数值: activeSubs.rows[0]?.count ?? 0, 单位: '个' },
    { 指标: '消息总数', 数值: totalMsgs.rows[0]?.count ?? 0, 单位: '条' },
    { 指标: '收入总额', 数值: Number(totalRevenue.rows[0]?.total ?? 0).toFixed(2), 单位: 'USD' },
  ];
}

/** 用户列表 CSV */
async function usersList(_range: DateRange): Promise<Record<string, unknown>[]> {
  const result = await db.execute<{
    name: string; email: string; variantName: string | null;
    status: string | null; createdAt: string; messageCount: number;
  }>(
    sql`SELECT u.name, u.email, s.variant_name as "variantName",
            s.status, u.created_at::text as "createdAt",
            COALESCE(m.msg_count, 0)::int as "messageCount"
        FROM "user" u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        LEFT JOIN (
          SELECT c.user_id, COUNT(*) as msg_count
          FROM messages m JOIN conversations c ON m.conversation_id = c.id
          GROUP BY c.user_id
        ) m ON m.user_id = u.id
        ORDER BY u.created_at DESC`
  );
  return result.rows.map((r) => ({
    用户名: r.name, 邮箱: r.email, 订阅方案: r.variantName ?? '免费',
    订阅状态: r.status ?? '无', 注册时间: r.createdAt, 消息数: r.messageCount,
  }));
}

/** 订阅列表 CSV */
async function subscriptionsList(_range: DateRange): Promise<Record<string, unknown>[]> {
  const result = await db.execute<{
    userName: string; userEmail: string; variantName: string;
    status: string; currentPeriodEnd: string | null; createdAt: string;
  }>(
    sql`SELECT u.name as "userName", u.email as "userEmail", s.variant_name as "variantName",
            s.status, s.current_period_end::text as "currentPeriodEnd", s.created_at::text as "createdAt"
        FROM subscriptions s
        JOIN "user" u ON s.user_id = u.id
        ORDER BY s.created_at DESC`
  );
  return result.rows.map((r) => ({
    用户名: r.userName, 邮箱: r.userEmail, 方案: r.variantName,
    状态: r.status, 当期截止: r.currentPeriodEnd ?? '-', 订阅时间: r.createdAt,
  }));
}

// ====== 模块路由表 ======
type QueryFn = (range: DateRange) => Promise<Record<string, unknown>[]>;

const CSV_MODULES: Record<string, { fn: QueryFn; filename: string }> = {
  'revenue:overview': { fn: revenueOverview, filename: 'revenue_overview.csv' },
  'revenue:trend':    { fn: revenueTrend, filename: 'revenue_trend.csv' },
  'revenue:funnel':   { fn: revenueFunnel, filename: 'revenue_funnel.csv' },
  'revenue:churn':    { fn: revenueChurn, filename: 'revenue_churn.csv' },
  'behavior:activity':  { fn: behaviorActivity, filename: 'behavior_activity.csv' },
  'behavior:engagement': { fn: behaviorEngagement, filename: 'behavior_engagement.csv' },
  'behavior:segments':   { fn: behaviorSegments, filename: 'behavior_segments.csv' },
  'dashboard:summary': { fn: dashboardSummary, filename: 'dashboard_summary.csv' },
  'users:list':    { fn: usersList, filename: 'users_list.csv' },
  'subscriptions:list': { fn: subscriptionsList, filename: 'subscriptions_list.csv' },
};

/** 模块 key 构造 */
function moduleKey(module: string, tab?: string): string {
  // revenue 模块用传入 tab，无 tab 时默认 overview
  if (module === 'revenue') return `revenue:${tab || 'overview'}`;
  if (module === 'behavior') return `behavior:${tab || 'activity'}`;
  // dashboard / users / subscriptions 直接匹配
  return `${module}:${tab || 'summary'}`;
}

// ====== POST Handler ======

export async function POST(req: NextRequest) {
  // Admin 鉴权
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  try {
    const body: ExportCsvRequest = await req.json();
    const { module, tab, start, end } = body;

    if (!module) {
      return NextResponse.json({ error: '缺少 module 参数' }, { status: 400 });
    }

    const range: DateRange = {
      start: start || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      end: end || new Date().toISOString().slice(0, 10),
    };

    const key = moduleKey(module, tab);
    const handler = CSV_MODULES[key];

    if (!handler) {
      return NextResponse.json(
        { error: `不支持的导出类型: ${key}` },
        { status: 400 },
      );
    }

    const rows = await handler.fn(range);

    // 从数据行中推断列
    const firstRow = rows[0];
    const columns: CsvColumn[] = firstRow
      ? Object.keys(firstRow).map((k) => ({ key: k, label: k }))
      : [];

    const csv = toCSV(columns, rows);
    return csvResponse(csv, handler.filename);
  } catch (error) {
    console.error('[ExportCSV] 导出失败:', error);
    return NextResponse.json({ error: '导出 CSV 失败' }, { status: 500 });
  }
}

// lib/stats/behavior.ts
// 用户行为分析查询引擎 — 16 个指标查询函数
// 分为四大类：活跃度(5)、用户分层(3)、对话深度(4)、专家使用(4)
// 数据来源: sessions, analytics_events, conversations, messages, user 表
// 分层阈值来源: analytics_settings 表（动态读取，不硬编码）

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

import type { DateRange } from './types';

// ============================================================
// 1. 活跃度指标 (5 个查询)
// ============================================================

/**
 * 查询 DAU（日活跃用户数）
 * 统计指定日期 session 表中去重的 user_id 数量
 * 当指定日期范围内只有一天时，queryDAU 与 queryMAU/WAU 配合计算 DAU/MAU 比值
 * @param range - 日期范围，通常 start === end 表示单日
 * @returns 活跃用户数
 */
export async function queryDAU(range: DateRange): Promise<number> {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT user_id)::int as count
        FROM sessions
        WHERE user_id IS NOT NULL
          AND started_at::date >= ${range.start}::date
          AND started_at::date <= ${range.end}::date`
  );
  return result.rows[0]?.count ?? 0;
}

/**
 * 查询 WAU（周活跃用户数）
 * 统计过去 7 天 sessions 表中去重的 user_id 数量
 * @param range - 日期范围，end 通常为今天
 * @returns 周活跃用户数
 */
export async function queryWAU(range: DateRange): Promise<number> {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT user_id)::int as count
        FROM sessions
        WHERE user_id IS NOT NULL
          AND started_at::date >= (${range.end}::date - INTERVAL '6 days')
          AND started_at::date <= ${range.end}::date`
  );
  return result.rows[0]?.count ?? 0;
}

/**
 * 查询 MAU（月活跃用户数）
 * 统计过去 30 天 sessions 表中去重的 user_id 数量
 * @param range - 日期范围，end 通常为今天
 * @returns 月活跃用户数
 */
export async function queryMAU(range: DateRange): Promise<number> {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT user_id)::int as count
        FROM sessions
        WHERE user_id IS NOT NULL
          AND started_at::date >= (${range.end}::date - INTERVAL '29 days')
          AND started_at::date <= ${range.end}::date`
  );
  return result.rows[0]?.count ?? 0;
}

/**
 * 查询 DAU/MAU 比值（用户粘性指标）
 * 计算公式：DAU / MAU × 100，值越高粘性越强
 * @param range - 日期范围，取 end 日期的 DAU 和 MAU
 * @returns 粘性百分比
 */
export async function queryDAUMAURatio(range: DateRange): Promise<number> {
  const dau = await queryDAU({ start: range.end, end: range.end });
  const mau = await queryMAU(range);
  return mau > 0 ? (dau / mau) * 100 : 0;
}

/**
 * 查询每日/每周会话数趋势
 * 按天统计 sessions 表中会话总数
 * @param range - 日期范围
 * @returns 日期-会话数对数组
 */
export async function querySessionCounts(range: DateRange): Promise<{ date: string; count: number }[]> {
  const result = await db.execute<{ date: string; count: number }>(
    sql`SELECT started_at::date::text as date, COUNT(*)::int as count
        FROM sessions
        WHERE started_at::date >= ${range.start}::date
          AND started_at::date <= ${range.end}::date
        GROUP BY started_at::date
        ORDER BY date`
  );
  return result.rows.map((r) => ({ date: r.date, count: Number(r.count) }));
}

/**
 * 查询平均会话时长（分钟）
 * 计算 sessions 表中 duration_seconds 字段的平均值
 * @param range - 日期范围
 * @returns 平均时长（分钟）
 */
export async function queryAvgSessionDuration(range: DateRange): Promise<number> {
  const result = await db.execute<{ avg: number }>(
    sql`SELECT COALESCE(AVG(duration_seconds), 0)::numeric as avg
        FROM sessions
        WHERE duration_seconds IS NOT NULL
          AND started_at::date >= ${range.start}::date
          AND started_at::date <= ${range.end}::date`
  );
  // 转换为分钟
  return Number(result.rows[0]?.avg ?? 0) / 60;
}

/**
 * 查询人均日会话数
 * 计算公式：范围总会话数 / 去重用户数 / 范围天数
 * @param range - 日期范围
 * @returns 人均日会话数
 */
export async function queryAvgSessionsPerUser(range: DateRange): Promise<number> {
  const sessionResult = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int as count
        FROM sessions
        WHERE started_at::date >= ${range.start}::date
          AND started_at::date <= ${range.end}::date`
  );
  const userResult = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT user_id)::int as count
        FROM sessions
        WHERE user_id IS NOT NULL
          AND started_at::date >= ${range.start}::date
          AND started_at::date <= ${range.end}::date`
  );
  const sessions = sessionResult.rows[0]?.count ?? 0;
  const users = userResult.rows[0]?.count ?? 0;
  // 计算范围内的天数
  const startDate = new Date(range.start);
  const endDate = new Date(range.end);
  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
  return users > 0 ? sessions / users / days : 0;
}

// ============================================================
// 2. 用户分层指标 (3 个查询)
// ============================================================

/** 活跃度分层阈值类型 */
interface SegmentThresholds {
  highActive: number;    // 高活用户最低活跃天数
  mediumActiveMin: number; // 中活用户最低活跃天数
  mediumActiveMax: number; // 中活用户最高活跃天数
  lowActiveMin: number;    // 低活用户最低活跃天数
  lowActiveMax: number;    // 低活用户最高活跃天数
  atRiskDays: number;      // 流失风险判断天数
  lostDays: number;        // 已流失判断天数
}

/**
 * 从 analytics_settings 表读取活跃度分层阈值
 * 动态读取，不硬编码数值
 * @returns 阈值对象
 */
async function getSegmentThresholds(): Promise<SegmentThresholds> {
  const keys = [
    'segment_high_active',
    'segment_medium_active_min',
    'segment_medium_active_max',
    'segment_low_active_min',
    'segment_low_active_max',
    'segment_at_risk_days',
    'segment_lost_days',
  ];
  const result = await db.execute<{ key: string; value: string }>(
    sql`SELECT key, value FROM analytics_settings WHERE key IN ${sql.raw(`('${keys.join("','")}')`)}`
  );
  const map: Record<string, number> = {};
  for (const r of result.rows) {
    map[r.key] = parseInt(r.value, 10) || 0;
  }
  return {
    highActive: map.segment_high_active || 20,
    mediumActiveMin: map.segment_medium_active_min || 7,
    mediumActiveMax: map.segment_medium_active_max || 19,
    lowActiveMin: map.segment_low_active_min || 1,
    lowActiveMax: map.segment_low_active_max || 6,
    atRiskDays: map.segment_at_risk_days || 30,
    lostDays: map.segment_lost_days || 30,
  };
}

/** 单个分层的用户统计 */
export interface SegmentCount {
  segment: string; // 分层名称
  label: string;   // 中文标签
  count: number;   // 用户数
  color: string;   // 图表配色
}

/**
 * 查询活跃度分层用户数
 * 从 analytics_settings 读取阈值，计算 5 层人数：
 * 高活用户（≥20天）、中活用户（7-19天）、低活用户（1-6天）、
 * 流失风险（未活跃但小于流失阈值天数）、已流失（超过流失阈值天数）
 * @param range - 日期范围，统计该范围内用户的活跃天数
 * @returns 各层用户统计数组
 */
export async function queryActivitySegments(range: DateRange): Promise<SegmentCount[]> {
  const thresholds = await getSegmentThresholds();

  // 统计指定日期范围内每个用户活跃天数
  // 同时检查最后活跃日期判定流失风险/已流失
  const result = await db.execute<{
    segment: string; count: number;
  }>(
    sql`WITH user_activity AS (
          SELECT
            user_id,
            COUNT(DISTINCT started_at::date)::int as active_days,
            MAX(started_at) as last_active
          FROM sessions
          WHERE user_id IS NOT NULL
            AND started_at::date >= ${range.start}::date
            AND started_at::date <= ${range.end}::date
          GROUP BY user_id
        ),
        all_users AS (
          SELECT DISTINCT user_id FROM sessions WHERE user_id IS NOT NULL
        )
        SELECT
          CASE
            WHEN ua.active_days >= ${thresholds.highActive} THEN 'high_active'
            WHEN ua.active_days >= ${thresholds.mediumActiveMin}
              AND ua.active_days <= ${thresholds.mediumActiveMax} THEN 'medium_active'
            WHEN ua.active_days >= ${thresholds.lowActiveMin}
              AND ua.active_days <= ${thresholds.lowActiveMax} THEN 'low_active'
            WHEN ua.last_active IS NOT NULL
              AND ua.last_active < NOW() - INTERVAL '1 day' * ${thresholds.atRiskDays}
              AND ua.last_active >= NOW() - INTERVAL '1 day' * ${thresholds.lostDays} THEN 'at_risk'
            ELSE 'lost'
          END as segment,
          COUNT(DISTINCT COALESCE(ua.user_id, au.user_id))::int as count
        FROM all_users au
        LEFT JOIN user_activity ua ON au.user_id = ua.user_id
        GROUP BY segment`
  );

  // 分层标签与配色映射
  const segmentMeta: Record<string, { label: string; color: string }> = {
    high_active: { label: '高活用户', color: '#22C55E' },
    medium_active: { label: '中活用户', color: '#3B82F6' },
    low_active: { label: '低活用户', color: '#F59E0B' },
    at_risk: { label: '流失风险', color: '#F97316' },
    lost: { label: '已流失', color: '#EF4444' },
  };

  return result.rows.map((r) => ({
    segment: r.segment,
    label: segmentMeta[r.segment]?.label ?? r.segment,
    count: Number(r.count),
    color: segmentMeta[r.segment]?.color ?? '#6B7280',
  }));
}

/** 每周各层占比数据点 */
export interface SegmentTrendPoint {
  week: string;        // 周标识（如 '2026-W27'）
  highActive: number;  // 高活用户占比 (%)
  mediumActive: number; // 中活用户占比 (%)
  lowActive: number;   // 低活用户占比 (%)
  atRisk: number;      // 流失风险占比 (%)
  lost: number;        // 已流失占比 (%)
}

/**
 * 查询每周各层占比趋势
 * 按周统计指定日期范围内各活跃度分层的用户数占比
 * @param range - 日期范围
 * @returns 每周各层占比数组
 */
export async function querySegmentTrend(range: DateRange): Promise<SegmentTrendPoint[]> {
  const thresholds = await getSegmentThresholds();

  const result = await db.execute<{
    week: string;
    segment: string;
    count: number;
  }>(
    sql`WITH weekly_activity AS (
          SELECT
            user_id,
            DATE_TRUNC('week', started_at)::date::text as week,
            COUNT(DISTINCT started_at::date)::int as active_days
          FROM sessions
          WHERE user_id IS NOT NULL
            AND started_at::date >= ${range.start}::date
            AND started_at::date <= ${range.end}::date
          GROUP BY user_id, DATE_TRUNC('week', started_at)::date
        )
        SELECT
          week,
          CASE
            WHEN active_days >= ${thresholds.highActive} THEN 'high_active'
            WHEN active_days >= ${thresholds.mediumActiveMin}
              AND active_days <= ${thresholds.mediumActiveMax} THEN 'medium_active'
            WHEN active_days >= ${thresholds.lowActiveMin}
              AND active_days <= ${thresholds.lowActiveMax} THEN 'low_active'
            ELSE 'at_risk'
          END as segment,
          COUNT(*)::int as count
        FROM weekly_activity
        GROUP BY week, segment
        ORDER BY week`
  );

  // 透视按周分组的数据
  const byWeek = new Map<string, Record<string, number>>();
  for (const r of result.rows) {
    if (!byWeek.has(r.week)) {
      byWeek.set(r.week, { highActive: 0, mediumActive: 0, lowActive: 0, atRisk: 0, lost: 0 });
    }
    const entry = byWeek.get(r.week)!;
    const segMap: Record<string, keyof typeof entry> = {
      high_active: 'highActive',
      medium_active: 'mediumActive',
      low_active: 'lowActive',
      at_risk: 'atRisk',
      lost: 'lost',
    };
    const key = segMap[r.segment];
    if (key) entry[key] = Number(r.count);
  }

  const trend: SegmentTrendPoint[] = [];
  for (const [week, counts] of byWeek) {
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    trend.push({
      week,
      highActive: total > 0 ? (counts.highActive / total) * 100 : 0,
      mediumActive: total > 0 ? (counts.mediumActive / total) * 100 : 0,
      lowActive: total > 0 ? (counts.lowActive / total) * 100 : 0,
      atRisk: total > 0 ? (counts.atRisk / total) * 100 : 0,
      lost: total > 0 ? (counts.lost / total) * 100 : 0,
    });
  }
  return trend;
}

/** 用户生命周期阶段统计 */
export interface LifecycleDistribution {
  stage: string;  // 阶段标识
  label: string;  // 中文标签
  count: number;  // 用户数
  color: string;  // 图表配色
}

/**
 * 查询用户生命周期阶段分布
 * 基于 user.created_at 计算：<7天 / 7-30天 / 30-90天 / >90天
 * 仅统计在指定日期范围内有会话记录的用户
 * @param range - 日期范围，用于过滤活跃用户
 * @returns 各阶段用户数
 */
export async function queryLifecycleDistribution(range: DateRange): Promise<LifecycleDistribution[]> {
  const result = await db.execute<{
    stage: string; count: number;
  }>(
    sql`SELECT
          CASE
            WHEN u.created_at >= NOW() - INTERVAL '7 days' THEN 'new'
            WHEN u.created_at >= NOW() - INTERVAL '30 days' THEN 'active'
            WHEN u.created_at >= NOW() - INTERVAL '90 days' THEN 'settled'
            ELSE 'veteran'
          END as stage,
          COUNT(DISTINCT u.id)::int as count
        FROM "user" u
        INNER JOIN sessions s ON s.user_id = u.id
          AND s.started_at::date >= ${range.start}::date
          AND s.started_at::date <= ${range.end}::date
        GROUP BY stage
        ORDER BY
          CASE
            WHEN stage = 'new' THEN 1
            WHEN stage = 'active' THEN 2
            WHEN stage = 'settled' THEN 3
            ELSE 4
          END`
  );

  const stageMeta: Record<string, { label: string; color: string }> = {
    new: { label: '新用户 (<7天)', color: '#22C55E' },
    active: { label: '活跃用户 (7-30天)', color: '#3B82F6' },
    settled: { label: '稳定用户 (30-90天)', color: '#8B5CF6' },
    veteran: { label: '老用户 (>90天)', color: '#F59E0B' },
  };

  return result.rows.map((r) => ({
    stage: r.stage,
    label: stageMeta[r.stage]?.label ?? r.stage,
    count: Number(r.count),
    color: stageMeta[r.stage]?.color ?? '#6B7280',
  }));
}

// ============================================================
// 3. 对话深度指标 (4 个查询)
// ============================================================

/**
 * 查询日均消息数趋势
 * 按天统计 messages 表中用户消息总数
 * @param range - 日期范围
 * @returns 日期-消息数对数组
 */
export async function queryDailyMessages(range: DateRange): Promise<{ date: string; count: number }[]> {
  const result = await db.execute<{ date: string; count: number }>(
    sql`SELECT created_at::date::text as date, COUNT(*)::int as count
        FROM messages
        WHERE role = 'user'
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date
        GROUP BY created_at::date
        ORDER BY date`
  );
  return result.rows.map((r) => ({ date: r.date, count: Number(r.count) }));
}

/**
 * 查询人均会话消息数
 * 计算每场对话中用户消息的平均数量
 * @param range - 日期范围
 * @returns 人均消息数
 */
export async function queryAvgMessagesPerConversation(range: DateRange): Promise<number> {
  const result = await db.execute<{ avg: number }>(
    sql`SELECT COALESCE(AVG(msg_count), 0)::numeric as avg
        FROM (
          SELECT conversation_id, COUNT(*)::int as msg_count
          FROM messages
          WHERE role = 'user'
            AND created_at::date >= ${range.start}::date
            AND created_at::date <= ${range.end}::date
          GROUP BY conversation_id
        ) sub`
  );
  return Number(result.rows[0]?.avg ?? 0);
}

/**
 * 查询对话完成率
 * 有 >1 条用户消息的对话占比（定义为"深度对话"）
 * @param range - 日期范围
 * @returns 完成率百分比
 */
export async function queryConversationCompletionRate(range: DateRange): Promise<number> {
  const result = await db.execute<{ rate: number }>(
    sql`WITH conv_msg AS (
          SELECT
            conversation_id,
            COUNT(*)::int as msg_count
          FROM messages
          WHERE role = 'user'
            AND created_at::date >= ${range.start}::date
            AND created_at::date <= ${range.end}::date
          GROUP BY conversation_id
        )
        SELECT
          CASE WHEN COUNT(*) > 0
            THEN (COUNT(*) FILTER (WHERE msg_count > 1)::numeric / COUNT(*)::numeric) * 100
            ELSE 0
          END as rate
        FROM conv_msg`
  );
  return Number(result.rows[0]?.rate ?? 0);
}

/**
 * 查询平均对话轮次
 * 用户↔AI 往返次数（每条用户消息算一轮）
 * @param range - 日期范围
 * @returns 平均轮次数
 */
export async function queryAvgTurns(range: DateRange): Promise<number> {
  const result = await db.execute<{ avg: number }>(
    sql`SELECT COALESCE(AVG(turn_count), 0)::numeric as avg
        FROM (
          SELECT conversation_id, COUNT(*)::int as turn_count
          FROM messages
          WHERE role = 'user'
            AND created_at::date >= ${range.start}::date
            AND created_at::date <= ${range.end}::date
          GROUP BY conversation_id
        ) sub`
  );
  return Number(result.rows[0]?.avg ?? 0);
}

/**
 * 查询日均消息数（汇总值）
 * 用于 KPI 卡片展示
 * @param range - 日期范围
 * @returns 日均消息数
 */
export async function queryAvgDailyMessageCount(range: DateRange): Promise<number> {
  const result = await db.execute<{ avg: number }>(
    sql`SELECT COALESCE(
          COUNT(*)::numeric / NULLIF(
            (${range.end}::date - ${range.start}::date) + 1, 0), 0
        )::numeric as avg
        FROM messages
        WHERE role = 'user'
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date`
  );
  return Number(result.rows[0]?.avg ?? 0);
}

// ============================================================
// 4. 专家使用指标 (4 个查询)
// ============================================================

/** 专家使用统计项 */
export interface ExpertUsage {
  expert: string;       // 专家标识（evan/liam/noah/adrian）
  label: string;        // 专家中文名
  conversationCount: number; // 对话数
  messageCount: number;      // 消息数
  color: string;        // 图表配色
}

/** 专家显示名映射 */
const EXPERT_LABELS: Record<string, string> = {
  evan: 'Evan',
  liam: 'Liam',
  noah: 'Noah',
  adrian: 'Adrian',
};

/** 专家配色映射 */
const EXPERT_COLORS: Record<string, string> = {
  evan: '#3B82F6',   // 蓝
  liam: '#22C55E',   // 绿
  noah: '#8B5CF6',   // 紫
  adrian: '#F59E0B', // 橙
};

/**
 * 查询各专家使用占比
 * 统计每个专家的对话数和消息总数
 * @param range - 日期范围
 * @returns 各专家使用统计数组
 */
export async function queryExpertUsageShare(range: DateRange): Promise<ExpertUsage[]> {
  const result = await db.execute<{
    expert: string; conversation_count: number; message_count: number;
  }>(
    sql`SELECT
          c.expert,
          COUNT(DISTINCT c.id)::int as conversation_count,
          COUNT(m.id)::int as message_count
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
          AND m.created_at::date >= ${range.start}::date
          AND m.created_at::date <= ${range.end}::date
        WHERE c.created_at::date >= ${range.start}::date
          AND c.created_at::date <= ${range.end}::date
        GROUP BY c.expert
        ORDER BY conversation_count DESC`
  );

  return result.rows.map((r) => ({
    expert: r.expert,
    label: EXPERT_LABELS[r.expert] ?? r.expert,
    conversationCount: Number(r.conversation_count),
    messageCount: Number(r.message_count),
    color: EXPERT_COLORS[r.expert] ?? '#6B7280',
  }));
}

/**
 * 查询各专家人均消息数
 * 每个专家的消息总数 / 该专家的对话数
 * @param range - 日期范围
 * @returns 各专家人均消息数组
 */
export async function queryExpertAvgMessages(range: DateRange): Promise<{
  expert: string; label: string; avgMessages: number; color: string;
}[]> {
  const result = await db.execute<{
    expert: string; conversation_count: number; message_count: number;
  }>(
    sql`SELECT
          c.expert,
          COUNT(DISTINCT c.id)::int as conversation_count,
          COUNT(m.id)::int as message_count
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
          AND m.created_at::date >= ${range.start}::date
          AND m.created_at::date <= ${range.end}::date
        WHERE c.created_at::date >= ${range.start}::date
          AND c.created_at::date <= ${range.end}::date
        GROUP BY c.expert`
  );

  return result.rows.map((r) => ({
    expert: r.expert,
    label: EXPERT_LABELS[r.expert] ?? r.expert,
    avgMessages: r.conversation_count > 0
      ? Number(r.message_count) / Number(r.conversation_count) : 0,
    color: EXPERT_COLORS[r.expert] ?? '#6B7280',
  }));
}

/**
 * 查询专家切换频率
 * 统计同一用户在同一天创建的对话中专家发生变化的次数
 * 切换频率 = 切换次数 / 总对话数（按天聚合）
 * @param range - 日期范围
 * @returns 平均切换频率
 */
export async function queryExpertSwitchFrequency(range: DateRange): Promise<number> {
  const result = await db.execute<{ frequency: number }>(
    sql`WITH ordered_convs AS (
          SELECT
            user_id,
            created_at::date as date,
            expert,
            LAG(expert) OVER (
              PARTITION BY user_id, created_at::date
              ORDER BY created_at
            ) as prev_expert
          FROM conversations
          WHERE created_at::date >= ${range.start}::date
            AND created_at::date <= ${range.end}::date
        ),
        switch_stats AS (
          SELECT
            date,
            COUNT(*) as total_convs,
            COUNT(*) FILTER (
              WHERE prev_expert IS NOT NULL AND prev_expert != expert
            ) as switches
          FROM ordered_convs
          GROUP BY date
        )
        SELECT
          CASE WHEN SUM(total_convs) > 0
            THEN (SUM(switches)::numeric / SUM(total_convs)::numeric) * 100
            ELSE 0
          END as frequency
        FROM switch_stats`
  );
  return Number(result.rows[0]?.frequency ?? 0);
}

/** 专家切换路径 */
export interface ExpertSwitchPath {
  from: string;   // 源专家标识
  to: string;     // 目标专家标识
  fromLabel: string; // 源专家中文名
  toLabel: string;   // 目标专家中文名
  count: number;  // 切换次数
}

/**
 * 查询专家偏好切换路径（Top 切换路径）
 * 统计同一用户按时间顺序创建对话时，专家→专家的切换频次
 * @param range - 日期范围
 * @returns Top 切换路径数组（按频次降序）
 */
export async function queryExpertSwitchPaths(range: DateRange): Promise<ExpertSwitchPath[]> {
  const result = await db.execute<{
    from: string; to: string; count: number;
  }>(
    sql`WITH ordered_convs AS (
          SELECT
            user_id,
            expert,
            LAG(expert) OVER (
              PARTITION BY user_id
              ORDER BY created_at
            ) as prev_expert
          FROM conversations
          WHERE created_at::date >= ${range.start}::date
            AND created_at::date <= ${range.end}::date
        )
        SELECT
          prev_expert as "from",
          expert as "to",
          COUNT(*)::int as count
        FROM ordered_convs
        WHERE prev_expert IS NOT NULL
          AND prev_expert != expert
        GROUP BY prev_expert, expert
        ORDER BY count DESC
        LIMIT 12`
  );

  return result.rows.map((r) => ({
    from: r.from,
    to: r.to,
    fromLabel: EXPERT_LABELS[r.from] ?? r.from,
    toLabel: EXPERT_LABELS[r.to] ?? r.to,
    count: Number(r.count),
  }));
}

/**
 * 查询各专家用户覆盖率
 * 有多少独立用户至少使用过该专家一次
 * @param range - 日期范围
 * @returns 各专家覆盖用户数
 */
export async function queryExpertUserReach(range: DateRange): Promise<{
  expert: string; label: string; userCount: number; color: string;
}[]> {
  const result = await db.execute<{
    expert: string; user_count: number;
  }>(
    sql`SELECT
          expert,
          COUNT(DISTINCT user_id)::int as user_count
        FROM conversations
        WHERE created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date
        GROUP BY expert
        ORDER BY user_count DESC`
  );

  return result.rows.map((r) => ({
    expert: r.expert,
    label: EXPERT_LABELS[r.expert] ?? r.expert,
    userCount: Number(r.user_count),
    color: EXPERT_COLORS[r.expert] ?? '#6B7280',
  }));
}

// lib/stats/revenue.ts
// 收入分析引擎 — 事件采集 + 查询
// 订阅事件采集和 MRR 缓存写入

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { analyticsEvents, mrrSnapshots, subscriptionEvents, subscriptions } from '@/lib/db/schema';

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

/** 有效 PlanVariant 值集合，用于运行时校验 */
const VALID_PLAN_VARIANTS: ReadonlySet<string> = new Set<PlanVariant>(['start', 'pro', 'ultra', 'admin']);

/**
 * 运行时校验字符串是否为有效的 PlanVariant
 * 防止 `as PlanVariant` 类型断言引入无效值导致 PLAN_RANK 查询返回 undefined
 * @param value - 待校验的字符串
 * @returns 有效的 PlanVariant，若无效则返回 null 并输出警告
 */
export function validatePlanVariant(value: string | null | undefined): PlanVariant | null {
  if (value && VALID_PLAN_VARIANTS.has(value)) {
    return value as PlanVariant;
  }
  if (value) {
    console.warn('[RevenueTracker] 未知的 PlanVariant 值:', value);
  }
  return null;
}

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
 * @param params.userId - 用户 ID，webhook 阶段可能为 null（ACTIVATED/RENEWED 尚无 userId）
 */
export function trackSubscriptionEvent(params: {
  userId: string | null;
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

// ============================================================
// 收入查询引擎 — 21 个查询函数
// 为收入分析 API 提供 MRR/ARR/转化/流失/LTV 等指标查询
// ============================================================

/** 日期范围查询参数（与 lib/stats/query.ts 中的 DateRange 保持一致） */
export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

// ----- 核心收入指标 -----

/**
 * 查询当前 MRR（月经常性收入）
 * 从 mrr_snapshots 表中取最新日期的 plan='all' 快照值
 * @returns MRR 金额（数字）
 */
export async function queryMRR(): Promise<number> {
  const result = await db.execute<{ total: number }>(
    sql`SELECT COALESCE(SUM(mrr_value), 0)::numeric as total
        FROM mrr_snapshots
        WHERE plan = 'all' AND date = (SELECT MAX(date) FROM mrr_snapshots)`
  );
  return Number(result.rows[0]?.total ?? 0);
}

/**
 * 查询当前 ARR（年经常性收入）
 * 基于活跃订阅中 billing_period = 'yearly' 的年化金额汇总
 * @returns ARR 金额（数字）
 */
export async function queryARR(): Promise<number> {
  const result = await db.execute<{ total: number }>(
    sql`SELECT COALESCE(SUM(
          CASE WHEN s.status = 'active' AND sub.billing_period = 'yearly'
            THEN (sub.amount::numeric / 12) * 12
            ELSE 0 END
        ), 0)::numeric as total
        FROM subscriptions s
        LEFT JOIN LATERAL (
          SELECT billing_period, amount FROM subscription_events
          WHERE paypal_subscription_id = s.paypal_subscription_id
          AND event_type = 'created'
          ORDER BY created_at DESC LIMIT 1
        ) sub ON true
        WHERE s.status = 'active'`
  );
  return Number(result.rows[0]?.total ?? 0);
}

/**
 * 查询 MRR 净增瀑布图数据（指定日期范围内）
 * 拆分为：新 MRR、扩展 MRR、流失 MRR、收缩 MRR
 * @param range - 日期范围
 * @returns 瀑布图各分项及期初/期末 MRR
 */
export async function queryMRRWaterfall(range: DateRange): Promise<{
  startingMRR: number;
  newMRR: number;
  expansionMRR: number;
  churnedMRR: number;
  contractionMRR: number;
  endingMRR: number;
}> {
  const startM = await db.execute<{ total: number }>(
    sql`SELECT COALESCE(mrr_value, 0)::numeric as total
        FROM mrr_snapshots
        WHERE plan = 'all' AND date = (${range.start}::date - INTERVAL '1 day')`
  );
  const newM = await db.execute<{ total: number }>(
    sql`SELECT COALESCE(SUM(CASE WHEN event_type = 'created' THEN amount ELSE 0 END), 0)::numeric as total
        FROM subscription_events
        WHERE event_type IN ('created')
          AND billing_period = 'monthly'
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date`
  );
  const expM = await db.execute<{ total: number }>(
    sql`SELECT COALESCE(SUM(CASE WHEN event_type = 'upgraded' THEN amount ELSE 0 END), 0)::numeric as total
        FROM subscription_events
        WHERE event_type = 'upgraded'
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date`
  );
  const churnM = await db.execute<{ total: number }>(
    sql`SELECT COALESCE(SUM(CASE WHEN event_type IN ('cancelled','expired') THEN amount ELSE 0 END), 0)::numeric as total
        FROM subscription_events
        WHERE event_type IN ('cancelled', 'expired')
          AND billing_period = 'monthly'
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date`
  );
  const contractM = await db.execute<{ total: number }>(
    sql`SELECT COALESCE(SUM(CASE WHEN event_type = 'downgraded' THEN amount ELSE 0 END), 0)::numeric as total
        FROM subscription_events
        WHERE event_type = 'downgraded'
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date`
  );
  const endM = await db.execute<{ total: number }>(
    sql`SELECT COALESCE(mrr_value, 0)::numeric as total
        FROM mrr_snapshots
        WHERE plan = 'all' AND date = ${range.end}::date`
  );
  return {
    startingMRR: Number(startM.rows[0]?.total ?? 0),
    newMRR: Number(newM.rows[0]?.total ?? 0),
    expansionMRR: Number(expM.rows[0]?.total ?? 0),
    churnedMRR: Number(churnM.rows[0]?.total ?? 0),
    contractionMRR: Number(contractM.rows[0]?.total ?? 0),
    endingMRR: Number(endM.rows[0]?.total ?? 0),
  };
}

/**
 * 查询各方案 MRR 占比（堆叠面积图数据）
 * 按日期分拆 start/pro/ultra 三个方案的 MRR 份额
 * @param range - 日期范围
 * @returns 日期数组及各方案对应的 MRR 值数组
 */
export async function queryPlanMRRShare(range: DateRange): Promise<{
  dates: string[];
  start: number[];
  pro: number[];
  ultra: number[];
}> {
  const result = await db.execute<{ date: string; plan: string; value: number }>(
    sql`SELECT date::text, plan, mrr_value::numeric as value
        FROM mrr_snapshots
        WHERE plan IN ('start', 'pro', 'ultra')
          AND date >= ${range.start}::date AND date <= ${range.end}::date
        ORDER BY date, plan`
  );
  const dates: string[] = [];
  const start: number[] = [];
  const pro: number[] = [];
  const ultra: number[] = [];
  const byDate = new Map<string, Record<string, number>>();
  for (const r of result.rows) {
    if (!byDate.has(r.date)) byDate.set(r.date, {});
    byDate.get(r.date)![r.plan] = Number(r.value);
  }
  for (const [date, vals] of byDate) {
    dates.push(date);
    start.push(vals.start ?? 0);
    pro.push(vals.pro ?? 0);
    ultra.push(vals.ultra ?? 0);
  }
  return { dates, start, pro, ultra };
}

/**
 * 查询 MRR 趋势序列（时序折线图数据）
 * @param range - 日期范围
 * @returns 日期-MRR 值对数组
 */
export async function queryMRRTrend(range: DateRange): Promise<{ date: string; value: number }[]> {
  const result = await db.execute<{ date: string; value: number }>(
    sql`SELECT date::text, mrr_value::numeric as value
        FROM mrr_snapshots
        WHERE plan = 'all' AND date >= ${range.start}::date AND date <= ${range.end}::date
        ORDER BY date`
  );
  return result.rows.map((r) => ({ date: r.date, value: Number(r.value) }));
}

// ----- 客户指标 -----

/**
 * 查询付费用户总数
 * 统计 status='active' 且方案为正式付费方案（start/pro/ultra）的用户数
 * @returns 付费用户数
 */
export async function queryPayingUsers(): Promise<number> {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT user_id)::int as count
        FROM subscriptions WHERE status = 'active' AND variant_name IN ('start','pro','ultra')`
  );
  return result.rows[0]?.count ?? 0;
}

/**
 * 查询新增付费用户数（指定日期范围）
 * 统计在日期范围内首次创建订阅的用户数
 * @param range - 日期范围
 * @returns 新增付费用户数
 */
export async function queryNewPayingUsers(range: DateRange): Promise<number> {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT user_id)::int as count
        FROM subscription_events
        WHERE event_type = 'created'
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date`
  );
  return result.rows[0]?.count ?? 0;
}

/**
 * 查询流失付费用户数（指定日期范围）
 * 统计在日期范围内取消或过期的用户数
 * @param range - 日期范围
 * @returns 流失用户数
 */
export async function queryChurnedUsers(range: DateRange): Promise<number> {
  const result = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT user_id)::int as count
        FROM subscription_events
        WHERE event_type IN ('cancelled', 'expired')
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date`
  );
  return result.rows[0]?.count ?? 0;
}

/**
 * 查询 ARPPU（每付费用户平均收入）
 * 计算公式：MRR / 付费用户数
 * @returns ARPPU 值
 */
export async function queryARPPU(): Promise<number> {
  const mrr = await queryMRR();
  const users = await queryPayingUsers();
  return users > 0 ? mrr / users : 0;
}

// ----- 转化漏斗 -----

/**
 * 查询游客到注册的转化率
 * 游客 = 产生 page_view 事件的匿名用户
 * 注册 = 产生 auth_register 事件的用户
 * @param range - 日期范围
 * @returns 游客数、注册数、转化率（百分比）
 */
export async function queryVisitorToRegisterRate(range: DateRange): Promise<{
  visitors: number; registrations: number; rate: number;
}> {
  const vResult = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT payload->>'anonymous_id')::int as count
        FROM analytics_events
        WHERE event_type = 'page_view'
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date`
  );
  const rResult = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT user_id)::int as count
        FROM analytics_events
        WHERE event_type = 'auth_register'
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date`
  );
  const visitors = vResult.rows[0]?.count ?? 0;
  const registrations = rResult.rows[0]?.count ?? 0;
  return { visitors, registrations, rate: visitors > 0 ? (registrations / visitors) * 100 : 0 };
}

/**
 * 查询注册到活跃的转化率
 * 活跃 = 注册后至少发送过 1 条消息的用户
 * @param range - 日期范围（用于限定注册用户群）
 * @returns 注册数、活跃数、转化率（百分比）
 */
export async function queryRegisterToActiveRate(range: DateRange): Promise<{
  registrations: number; active: number; rate: number;
}> {
  const rResult = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT user_id)::int as count
        FROM analytics_events
        WHERE event_type = 'auth_register'
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date`
  );
  const aResult = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT e.user_id)::int as count
        FROM analytics_events e
        INNER JOIN (
          SELECT DISTINCT user_id FROM analytics_events
          WHERE event_type = 'auth_register'
            AND created_at::date >= ${range.start}::date
            AND created_at::date <= ${range.end}::date
        ) r ON e.user_id = r.user_id
        WHERE e.event_type = 'message_sent'`
  );
  const registrations = rResult.rows[0]?.count ?? 0;
  const active = aResult.rows[0]?.count ?? 0;
  return { registrations, active, rate: registrations > 0 ? (active / registrations) * 100 : 0 };
}

/**
 * 查询活跃到付费的转化率
 * 活跃 = 在日期范围内至少发送过 1 条消息的用户
 * 付费 = 在日期范围内产生了 created 订阅事件的用户
 * @param range - 日期范围
 * @returns 活跃数、付费数、转化率（百分比）
 */
export async function queryActiveToPaidRate(range: DateRange): Promise<{
  active: number; paid: number; rate: number;
}> {
  const aResult = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT user_id)::int as count
        FROM analytics_events
        WHERE event_type = 'message_sent'
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date`
  );
  const pResult = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT user_id)::int as count
        FROM subscription_events
        WHERE event_type = 'created'
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date`
  );
  const active = aResult.rows[0]?.count ?? 0;
  const paid = pResult.rows[0]?.count ?? 0;
  return { active, paid, rate: active > 0 ? (paid / active) * 100 : 0 };
}

/**
 * 查询试用到付费的平均转化天数
 * 计算从用户注册到首次创建订阅之间的平均天数
 * @returns 平均转化天数
 */
export async function queryTrialToPaidAvgDays(): Promise<number> {
  const result = await db.execute<{ days: number }>(
    sql`SELECT AVG(
          (SELECT MIN(created_at)::date FROM subscription_events se2
           WHERE se2.user_id = u.id AND se2.event_type = 'created')
          - u.created_at::date
        )::numeric as days
        FROM "user" u
        WHERE EXISTS (
          SELECT 1 FROM subscription_events se
          WHERE se.user_id = u.id AND se.event_type = 'created'
        )`
  );
  return Number(result.rows[0]?.days ?? 0);
}

/**
 * 查询新订阅方案选择分布
 * 统计在日期范围内各方案的新订阅数
 * @param range - 日期范围
 * @returns 方案名-订阅数对数组
 */
export async function queryNewSubPlanDistribution(range: DateRange): Promise<{
  plan: string; count: number;
}[]> {
  const result = await db.execute<{ plan: string; count: number }>(
    sql`SELECT plan, COUNT(*)::int as count
        FROM subscription_events
        WHERE event_type = 'created'
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date
        GROUP BY plan ORDER BY count DESC`
  );
  return result.rows;
}

// ----- 流失分析 -----

/**
 * 查询客户流失率
 * 计算公式：日期范围内流失用户数 / 期初活跃订阅数
 * @param range - 日期范围
 * @returns 流失率（百分比）
 */
export async function queryChurnRate(range: DateRange): Promise<number> {
  const churned = await queryChurnedUsers(range);
  const startPaying = await db.execute<{ count: number }>(
    sql`SELECT COUNT(DISTINCT user_id)::int as count
        FROM subscriptions WHERE status = 'active'
          AND created_at::date <= ${range.start}::date`
  );
  const total = startPaying.rows[0]?.count ?? 0;
  return total > 0 ? (churned / total) * 100 : 0;
}

/**
 * 查询收入流失率
 * 计算公式：日期范围内流失 MRR / 期初 MRR
 * @param range - 日期范围
 * @returns 收入流失率（百分比）
 */
export async function queryRevenueChurnRate(range: DateRange): Promise<number> {
  const result = await db.execute<{ churned: number; total: number }>(
    sql`SELECT
          COALESCE(SUM(CASE WHEN event_type IN ('cancelled','expired')
            AND created_at::date >= ${range.start}::date
            AND created_at::date <= ${range.end}::date
            AND billing_period = 'monthly' THEN amount ELSE 0 END), 0)::numeric as churned,
          COALESCE((SELECT mrr_value FROM mrr_snapshots
            WHERE plan = 'all' AND date = (${range.start}::date - INTERVAL '1 day')), 0)::numeric as total`
  );
  const churned = Number(result.rows[0]?.churned ?? 0);
  const total = Number(result.rows[0]?.total ?? 0);
  return total > 0 ? (churned / total) * 100 : 0;
}

/**
 * 查询按方案分组的流失率
 * 对每个方案分别计算流失用户数、总用户数、流失率
 * @param range - 日期范围
 * @returns 按方案分组的流失指标数组
 */
export async function queryChurnRateByPlan(range: DateRange): Promise<{
  plan: string; churned: number; total: number; rate: number;
}[]> {
  const result = await db.execute<{ plan: string; churned: number; total: number }>(
    sql`SELECT
          s.plan,
          COUNT(DISTINCT CASE WHEN s.event_type IN ('cancelled','expired')
            AND s.created_at::date >= ${range.start}::date
            AND s.created_at::date <= ${range.end}::date THEN s.user_id END)::int as churned,
          COUNT(DISTINCT CASE WHEN s.event_type = 'created'
            AND s.created_at::date <= ${range.start}::date THEN s.user_id END)::int as total
        FROM subscription_events s
        WHERE s.plan IN ('start','pro','ultra')
        GROUP BY s.plan`
  );
  return result.rows.map((r) => ({
    plan: r.plan,
    churned: r.churned,
    total: r.total,
    rate: r.total > 0 ? (r.churned / r.total) * 100 : 0,
  }));
}

/**
 * 查询按使用时长的留存率分布
 * 在 1/3/6/9/12 个月里程碑上计算仍有活跃订阅的用户比例
 * @returns 各里程碑的留存率数组
 */
export async function queryChurnByDuration(): Promise<{
  months: number; retentionRate: number;
}[]> {
  const milestones = [1, 3, 6, 9, 12];
  const results: { months: number; retentionRate: number }[] = [];
  for (const m of milestones) {
    const result = await db.execute<{ rate: number }>(
      sql`WITH first_sub AS (
            SELECT user_id, MIN(created_at) as first_date
            FROM subscription_events WHERE event_type = 'created'
            GROUP BY user_id
          ),
          still_active AS (
            SELECT fs.user_id
            FROM first_sub fs
            WHERE EXISTS (
              SELECT 1 FROM subscriptions s
              WHERE s.user_id = fs.user_id AND s.status = 'active'
            )
            AND fs.first_date <= (CURRENT_DATE - INTERVAL '${m} months')
          )
          SELECT CASE WHEN (SELECT COUNT(*) FROM first_sub
            WHERE first_date <= (CURRENT_DATE - INTERVAL '${m} months')) > 0
            THEN (SELECT COUNT(*)::numeric FROM still_active)
              / (SELECT COUNT(*)::numeric FROM first_sub
                WHERE first_date <= (CURRENT_DATE - INTERVAL '${m} months')) * 100
            ELSE 0 END as rate`
    );
    results.push({ months: m, retentionRate: Number(result.rows[0]?.rate ?? 0) });
  }
  return results;
}

// ----- 升级/降级 -----

/**
 * 查询升级/降级次数
 * 统计在日期范围内的升级事件数和降级事件数
 * @param range - 日期范围
 * @returns 升级次数和降级次数
 */
export async function queryUpgradeDowngrade(range: DateRange): Promise<{
  upgrades: number; downgrades: number;
}> {
  const result = await db.execute<{ upgrades: number; downgrades: number }>(
    sql`SELECT
          COUNT(*) FILTER (WHERE event_type = 'upgraded')::int as upgrades,
          COUNT(*) FILTER (WHERE event_type = 'downgraded')::int as downgrades
        FROM subscription_events
        WHERE event_type IN ('upgraded', 'downgraded')
          AND created_at::date >= ${range.start}::date
          AND created_at::date <= ${range.end}::date`
  );
  return { upgrades: result.rows[0]?.upgrades ?? 0, downgrades: result.rows[0]?.downgrades ?? 0 };
}

/**
 * 查询升级率
 * 计算公式：日期范围内升级次数 / 当前付费用户数
 * @param range - 日期范围
 * @returns 升级率（百分比）
 */
export async function queryUpgradeRate(range: DateRange): Promise<number> {
  const { upgrades } = await queryUpgradeDowngrade(range);
  const payingUsers = await queryPayingUsers();
  return payingUsers > 0 ? (upgrades / payingUsers) * 100 : 0;
}

// ----- LTV -----

/**
 * 查询 LTV（用户生命周期价值）估算
 * 计算公式：ARPPU / 月度流失率（按方案分别计算 + 总计）
 * @returns 总计及各方案的 LTV 估算值
 */
export async function queryLTV(): Promise<{
  total: number; start: number; pro: number; ultra: number;
}> {
  const arppu = await queryARPPU();
  const range: DateRange = {
    start: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  };
  const churnRate = await queryChurnRate(range);
  const monthlyChurn = churnRate / 100;
  const total = monthlyChurn > 0 ? arppu / monthlyChurn : 0;

  // 按方案分别计算 LTV
  const byPlan = await queryChurnRateByPlan(range);
  const getPlanLTV = (plan: string) => {
    const p = byPlan.find((b) => b.plan === plan);
    const planChurn = (p?.rate ?? 1) / 100;
    // 简化：按方案 ARPPU 使用总体 ARPPU 近似（暂无按方案 revenue 拆分数据）
    return planChurn > 0 ? arppu / planChurn : 0;
  };

  return {
    total: Math.round(total * 100) / 100,
    start: Math.round(getPlanLTV('start') * 100) / 100,
    pro: Math.round(getPlanLTV('pro') * 100) / 100,
    ultra: Math.round(getPlanLTV('ultra') * 100) / 100,
  };
}

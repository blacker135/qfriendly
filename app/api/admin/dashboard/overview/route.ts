// app/api/admin/dashboard/overview/route.ts
// GET /api/admin/dashboard/overview — 返回综合仪表盘所有数据
// 一步返回 5 个实时指标 + 6 个模块概览 + sparkline 趋势数据

import { getAdminUserId } from '@/lib/admin/guard';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * DATE 辅助：计算日期字符串
 */
const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

// ─── Sparkline 数据类型 ───
interface SparklinePoint {
  date: string;
  value: number;
}

// ─── 专家数据类型 ───
interface ExpertItem {
  name: string;
  count: number;
}

export async function GET() {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  try {
    // ============================================================
    // 1. 实时指标
    // ============================================================

    // 今日收入（从 analytics_events 中 payment_completed）
    const [todayRevenueResult, yesterdayRevenueResult] = await Promise.all([
      db.execute<{ total: number }>(
        sql`SELECT COALESCE(SUM((payload->>'amount')::numeric), 0) as total
            FROM analytics_events
            WHERE event_type = 'payment_completed'
              AND created_at::date = CURRENT_DATE`
      ),
      db.execute<{ total: number }>(
        sql`SELECT COALESCE(SUM((payload->>'amount')::numeric), 0) as total
            FROM analytics_events
            WHERE event_type = 'payment_completed'
              AND created_at::date = CURRENT_DATE - INTERVAL '1 day'`
      ),
    ]);

    // 今日新增用户
    const [todayNewUsersResult, yesterdayNewUsersResult] = await Promise.all([
      db.execute<{ count: number }>(
        sql`SELECT COUNT(*)::int as count FROM "user" WHERE created_at::date = CURRENT_DATE`
      ),
      db.execute<{ count: number }>(
        sql`SELECT COUNT(*)::int as count FROM "user" WHERE created_at::date = CURRENT_DATE - INTERVAL '1 day'`
      ),
    ]);

    // 今日 DAU（从 sessions 表）
    const [todayDAUResult, yesterdayDAUResult] = await Promise.all([
      db.execute<{ count: number }>(
        sql`SELECT COUNT(DISTINCT user_id)::int as count
            FROM sessions
            WHERE started_at::date = CURRENT_DATE`
      ),
      db.execute<{ count: number }>(
        sql`SELECT COUNT(DISTINCT user_id)::int as count
            FROM sessions
            WHERE started_at::date = CURRENT_DATE - INTERVAL '1 day'`
      ),
    ]);

    // 今日消息数
    const [todayMessagesResult, yesterdayMessagesResult] = await Promise.all([
      db.execute<{ count: number }>(
        sql`SELECT COUNT(*)::int as count
            FROM messages WHERE created_at::date = CURRENT_DATE`
      ),
      db.execute<{ count: number }>(
        sql`SELECT COUNT(*)::int as count
            FROM messages WHERE created_at::date = CURRENT_DATE - INTERVAL '1 day'`
      ),
    ]);

    // 当前在线用户数（最近 10 分钟有心跳且未结束的 session）
    const onlineNowResult = await db.execute<{ count: number }>(
      sql`SELECT COUNT(DISTINCT COALESCE(user_id, anonymous_id))::int as count
          FROM sessions
          WHERE last_heartbeat_at >= NOW() - INTERVAL '10 minutes'
            AND ended_at IS NULL`
    );

    const rt = {
      todayRevenue: Number(todayRevenueResult.rows[0]?.total ?? 0),
      yesterdayRevenue: Number(yesterdayRevenueResult.rows[0]?.total ?? 0),
      todayNewUsers: todayNewUsersResult.rows[0]?.count ?? 0,
      yesterdayNewUsers: yesterdayNewUsersResult.rows[0]?.count ?? 0,
      todayDAU: todayDAUResult.rows[0]?.count ?? 0,
      yesterdayDAU: yesterdayDAUResult.rows[0]?.count ?? 0,
      todayMessages: todayMessagesResult.rows[0]?.count ?? 0,
      yesterdayMessages: yesterdayMessagesResult.rows[0]?.count ?? 0,
      onlineNow: onlineNowResult.rows[0]?.count ?? 0,
    };

    // ============================================================
    // 2. 模块数据
    // ============================================================

    // ─── 2a. 收入概览: MRR / ARPPU / 付费用户 ───
    const [mrrResult, payingUsersResult] = await Promise.all([
      db.execute<{ total: number }>(
        sql`SELECT COALESCE(SUM(mrr_value), 0)::numeric as total
            FROM mrr_snapshots
            WHERE plan = 'all' AND date = (SELECT MAX(date) FROM mrr_snapshots)`
      ),
      db.execute<{ count: number }>(
        sql`SELECT COUNT(DISTINCT user_id)::int as count
            FROM subscriptions WHERE status = 'active'
              AND variant_name IN ('start','pro','ultra')`
      ),
    ]);
    const mrr = Number(mrrResult.rows[0]?.total ?? 0);
    const payingUsers = payingUsersResult.rows[0]?.count ?? 0;
    const arppu = payingUsers > 0 ? mrr / payingUsers : 0;

    // 收入趋势（30天）
    const mrrTrend30d = await db.execute<{ date: string; value: number }>(
      sql`SELECT date::text, mrr_value::numeric as value
          FROM mrr_snapshots
          WHERE plan = 'all' AND date >= ${thirtyDaysAgo}::date AND date <= ${today}::date
          ORDER BY date`
    );
    const mrrTrend7d = await db.execute<{ date: string; value: number }>(
      sql`SELECT date::text, mrr_value::numeric as value
          FROM mrr_snapshots
          WHERE plan = 'all' AND date >= ${sevenDaysAgo}::date AND date <= ${today}::date
          ORDER BY date`
    );

    // ─── 2b. 用户活跃: DAU/MAU / WAU / MAU ───
    const [dauResult, wauResult, mauResult] = await Promise.all([
      db.execute<{ count: number }>(
        sql`SELECT COUNT(DISTINCT user_id)::int as count
            FROM sessions
            WHERE user_id IS NOT NULL
              AND started_at::date = CURRENT_DATE`
      ),
      db.execute<{ count: number }>(
        sql`SELECT COUNT(DISTINCT user_id)::int as count
            FROM sessions
            WHERE user_id IS NOT NULL
              AND started_at::date >= CURRENT_DATE - INTERVAL '6 days'`
      ),
      db.execute<{ count: number }>(
        sql`SELECT COUNT(DISTINCT user_id)::int as count
            FROM sessions
            WHERE user_id IS NOT NULL
              AND started_at::date >= CURRENT_DATE - INTERVAL '29 days'`
      ),
    ]);
    const dau = dauResult.rows[0]?.count ?? 0;
    const wau = wauResult.rows[0]?.count ?? 0;
    const mau = mauResult.rows[0]?.count ?? 0;
    const dauMauRatio = mau > 0 ? (dau / mau) * 100 : 0;

    // DAU 趋势（30天/7天）
    const dauTrend30d = await db.execute<{ date: string; value: number }>(
      sql`SELECT date::text, metric_value::numeric as value
          FROM analytics_daily_stats
          WHERE metric_key = 'dau' AND date >= ${thirtyDaysAgo}::date AND date <= ${today}::date
          ORDER BY date`
    );
    const dauTrend7d = await db.execute<{ date: string; value: number }>(
      sql`SELECT date::text, metric_value::numeric as value
          FROM analytics_daily_stats
          WHERE metric_key = 'dau' AND date >= ${sevenDaysAgo}::date AND date <= ${today}::date
          ORDER BY date`
    );

    // ─── 2c. 转化漏斗: 4 层（游客→注册→活跃→付费） ───
    const funnelData = await db.execute<{ stage: string; count: number }>(
      sql`SELECT 'visitors' as stage, COUNT(DISTINCT payload->>'anonymous_id')::int as count
          FROM analytics_events
          WHERE event_type = 'page_view'
          UNION ALL
          SELECT 'registered', COUNT(DISTINCT user_id)::int
          FROM analytics_events WHERE event_type = 'auth_register'
          UNION ALL
          SELECT 'active', COUNT(DISTINCT user_id)::int
          FROM analytics_events WHERE event_type = 'message_sent'
          UNION ALL
          SELECT 'paid', COUNT(DISTINCT user_id)::int
          FROM subscription_events WHERE event_type = 'created'`
    );
    const funnelMap: Record<string, number> = {};
    for (const r of funnelData.rows) { funnelMap[r.stage] = Number(r.count); }

    // ─── 2d. 订阅健康: 新增 vs 流失 / 流失率 ───
    const [newSubsToday, churnedToday, activeSubsTotal] = await Promise.all([
      db.execute<{ count: number }>(
        sql`SELECT COUNT(DISTINCT user_id)::int as count
            FROM subscription_events
            WHERE event_type = 'created' AND created_at::date = CURRENT_DATE`
      ),
      db.execute<{ count: number }>(
        sql`SELECT COUNT(DISTINCT user_id)::int as count
            FROM subscription_events
            WHERE event_type IN ('cancelled','expired')
              AND created_at::date = CURRENT_DATE`
      ),
      db.execute<{ count: number }>(
        sql`SELECT COUNT(DISTINCT user_id)::int as count
            FROM subscriptions WHERE status = 'active'
              AND variant_name IN ('start','pro','ultra')`
      ),
    ]);
    const newSubs = newSubsToday.rows[0]?.count ?? 0;
    const churned = churnedToday.rows[0]?.count ?? 0;
    const totalActiveSubs = activeSubsTotal.rows[0]?.count ?? 0;
    const churnRate = totalActiveSubs > 0 ? (churned / totalActiveSubs) * 100 : 0;

    // 净增趋势（netNewSubs = 新增 - 流失，按天聚合 30天）
    const netSubTrendResult = await db.execute<{ date: string; value: number }>(
      sql`SELECT created_at::date::text as date,
                 (COALESCE(SUM(CASE WHEN event_type = 'created' THEN 1 ELSE 0 END), 0)
                - COALESCE(SUM(CASE WHEN event_type IN ('cancelled','expired') THEN 1 ELSE 0 END), 0))::numeric as value
          FROM subscription_events
          WHERE created_at::date >= ${thirtyDaysAgo}::date AND created_at::date <= ${today}::date
          GROUP BY created_at::date
          ORDER BY date`
    );

    // ─── 2e. 流量概览: PV / UV / 曝光 ───
    const trafficResult = await db.execute<{ metricKey: string; value: number }>(
      sql`SELECT metric_key as "metricKey", SUM(metric_value)::numeric as value
          FROM analytics_daily_stats
          WHERE metric_key IN ('pv', 'uv', 'homepage_exposure')
          GROUP BY metric_key`
    );
    const trafficMap: Record<string, number> = { pv: 0, uv: 0, homepage_exposure: 0 };
    for (const r of trafficResult.rows) { trafficMap[r.metricKey] = Number(r.value); }

    // PV/UV 趋势（30天/7天）
    const pvTrend30d = await db.execute<{ date: string; value: number }>(
      sql`SELECT date::text, metric_value::numeric as value
          FROM analytics_daily_stats
          WHERE metric_key = 'pv' AND date >= ${thirtyDaysAgo}::date AND date <= ${today}::date
          ORDER BY date`
    );
    const pvTrend7d = await db.execute<{ date: string; value: number }>(
      sql`SELECT date::text, metric_value::numeric as value
          FROM analytics_daily_stats
          WHERE metric_key = 'pv' AND date >= ${sevenDaysAgo}::date AND date <= ${today}::date
          ORDER BY date`
    );
    const uvTrend30d = await db.execute<{ date: string; value: number }>(
      sql`SELECT date::text, metric_value::numeric as value
          FROM analytics_daily_stats
          WHERE metric_key = 'uv' AND date >= ${thirtyDaysAgo}::date AND date <= ${today}::date
          ORDER BY date`
    );
    const uvTrend7d = await db.execute<{ date: string; value: number }>(
      sql`SELECT date::text, metric_value::numeric as value
          FROM analytics_daily_stats
          WHERE metric_key = 'uv' AND date >= ${sevenDaysAgo}::date AND date <= ${today}::date
          ORDER BY date`
    );

    // ─── 2f. 专家热度 ───
    const expertsResult = await db.execute<{ expert: string; count: number }>(
      sql`SELECT expert, COUNT(*)::int as count
          FROM conversations GROUP BY expert ORDER BY count DESC LIMIT 4`
    );
    const experts: ExpertItem[] = expertsResult.rows.map((r) => ({
      name: r.expert,
      count: Number(r.count),
    }));

    // ─── 今日消息 sparkline（用于实时指标卡的趋势） ───
    const messageSparkline30d = await db.execute<{ date: string; value: number }>(
      sql`SELECT date::text, metric_value::numeric as value
          FROM analytics_daily_stats
          WHERE metric_key = 'message_count' AND date >= ${thirtyDaysAgo}::date AND date <= ${today}::date
          ORDER BY date`
    );
    const messageSparkline7d = await db.execute<{ date: string; value: number }>(
      sql`SELECT date::text, metric_value::numeric as value
          FROM analytics_daily_stats
          WHERE metric_key = 'message_count' AND date >= ${sevenDaysAgo}::date AND date <= ${today}::date
          ORDER BY date`
    );

    // 净增趋势 7 天
    const netSubTrend7dResult = await db.execute<{ date: string; value: number }>(
      sql`SELECT created_at::date::text as date,
                 (COALESCE(SUM(CASE WHEN event_type = 'created' THEN 1 ELSE 0 END), 0)
                - COALESCE(SUM(CASE WHEN event_type IN ('cancelled','expired') THEN 1 ELSE 0 END), 0))::numeric as value
          FROM subscription_events
          WHERE created_at::date >= ${sevenDaysAgo}::date AND created_at::date <= ${today}::date
          GROUP BY created_at::date
          ORDER BY date`
    );

    // 收入 sparkline（用于实时指标卡）
    const revenueSparkline30d = await db.execute<{ date: string; value: number }>(
      sql`SELECT created_at::date::text as date,
                 COALESCE(SUM((payload->>'amount')::numeric), 0)::numeric as value
          FROM analytics_events
          WHERE event_type = 'payment_completed'
            AND created_at::date >= ${thirtyDaysAgo}::date AND created_at::date <= ${today}::date
          GROUP BY created_at::date
          ORDER BY date`
    );
    const revenueSparkline7d = await db.execute<{ date: string; value: number }>(
      sql`SELECT created_at::date::text as date,
                 COALESCE(SUM((payload->>'amount')::numeric), 0)::numeric as value
          FROM analytics_events
          WHERE event_type = 'payment_completed'
            AND created_at::date >= ${sevenDaysAgo}::date AND created_at::date <= ${today}::date
          GROUP BY created_at::date
          ORDER BY date`
    );

    // 新增用户 sparkline（30天/7天）
    const newUsersTrend30d = await db.execute<{ date: string; value: number }>(
      sql`SELECT created_at::date::text as date, COUNT(*)::int as value
          FROM "user"
          WHERE created_at::date >= ${thirtyDaysAgo}::date AND created_at::date <= ${today}::date
          GROUP BY created_at::date
          ORDER BY date`
    );
    const newUsersTrend7d = await db.execute<{ date: string; value: number }>(
      sql`SELECT created_at::date::text as date, COUNT(*)::int as value
          FROM "user"
          WHERE created_at::date >= ${sevenDaysAgo}::date AND created_at::date <= ${today}::date
          GROUP BY created_at::date
          ORDER BY date`
    );

    // DAU sparkline 用于实时指标卡 (复用 dauTrend)
    const realtimeDAUSparkline30d = dauTrend30d.rows.map((r) => ({ date: r.date, value: Number(r.value) }));
    const realtimeDAUSparkline7d = dauTrend7d.rows.map((r) => ({ date: r.date, value: Number(r.value) }));

    // ============================================================
    // 组装响应
    // ============================================================

    // 辅助：计算涨跌幅
    const calcChange = (today: number, yesterday: number): number => {
      if (yesterday === 0) return today > 0 ? 100 : 0;
      return ((today - yesterday) / yesterday) * 100;
    };

    // 辅助：格式化行数据为 SparklinePoint[]
    const toSparkline = (rows: { date: string; value: unknown }[]): SparklinePoint[] =>
      rows.map((r) => ({ date: r.date, value: Number(r.value) }));

    return NextResponse.json({
      realtime: {
        todayRevenue: rt.todayRevenue,
        yesterdayRevenue: rt.yesterdayRevenue,
        revenueChange: calcChange(rt.todayRevenue, rt.yesterdayRevenue),
        todayNewUsers: rt.todayNewUsers,
        yesterdayNewUsers: rt.yesterdayNewUsers,
        newUsersChange: calcChange(rt.todayNewUsers, rt.yesterdayNewUsers),
        todayDAU: rt.todayDAU,
        yesterdayDAU: rt.yesterdayDAU,
        dauChange: calcChange(rt.todayDAU, rt.yesterdayDAU),
        todayMessages: rt.todayMessages,
        yesterdayMessages: rt.yesterdayMessages,
        messagesChange: calcChange(rt.todayMessages, rt.yesterdayMessages),
        onlineNow: rt.onlineNow,
      },
      modules: {
        revenue: {
          mrr,
          arppu,
          payingUsers,
        },
        activity: {
          dauMauRatio,
          wau,
          mau,
        },
        funnel: {
          visitors: funnelMap.visitors ?? 0,
          registered: funnelMap.registered ?? 0,
          active: funnelMap.active ?? 0,
          paid: funnelMap.paid ?? 0,
        },
        subscription: {
          newSubs,
          churned,
          churnRate,
        },
        traffic: {
          pv: trafficMap.pv ?? 0,
          uv: trafficMap.uv ?? 0,
          exposure: trafficMap.homepage_exposure ?? 0,
        },
        experts,
      },
      sparklines: {
        revenue: {
          '7d': toSparkline(revenueSparkline7d.rows),
          '30d': toSparkline(revenueSparkline30d.rows),
        },
        dau: {
          '7d': realtimeDAUSparkline7d,
          '30d': realtimeDAUSparkline30d,
        },
        messages: {
          '7d': toSparkline(messageSparkline7d.rows),
          '30d': toSparkline(messageSparkline30d.rows),
        },
        newUsers: {
          '7d': toSparkline(newUsersTrend7d.rows),
          '30d': toSparkline(newUsersTrend30d.rows),
        },
        netSubs: {
          '7d': toSparkline(netSubTrend7dResult.rows),
          '30d': toSparkline(netSubTrendResult.rows),
        },
        pv: {
          '7d': toSparkline(pvTrend7d.rows),
          '30d': toSparkline(pvTrend30d.rows),
        },
        uv: {
          '7d': toSparkline(uvTrend7d.rows),
          '30d': toSparkline(uvTrend30d.rows),
        },
        mrr: {
          '7d': toSparkline(mrrTrend7d.rows),
          '30d': toSparkline(mrrTrend30d.rows),
        },
      },
    });
  } catch (error) {
    console.error('[AdminDashboardOverview] 获取概览数据失败:', error);
    return NextResponse.json({ error: '获取仪表盘数据失败' }, { status: 500 });
  }
}

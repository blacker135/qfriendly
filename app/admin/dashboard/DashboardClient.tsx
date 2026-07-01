'use client';
// app/admin/dashboard/DashboardClient.tsx
// 综合仪表盘客户端组件 — 从 overview API 获取数据，渲染实时指标 + 模块概览

import { useState, useEffect, useCallback } from 'react';
import RealtimeCard from '@/components/admin/dashboard/RealtimeCard';
import ModuleCard, { type ExpertBar, type FunnelStep } from '@/components/admin/dashboard/ModuleCard';

// ─── 类型定义 ───

/** API 响应中的实时指标 */
interface RealtimeData {
  todayRevenue: number;
  yesterdayRevenue: number;
  revenueChange: number;
  todayNewUsers: number;
  yesterdayNewUsers: number;
  newUsersChange: number;
  todayDAU: number;
  yesterdayDAU: number;
  dauChange: number;
  todayMessages: number;
  yesterdayMessages: number;
  messagesChange: number;
  onlineNow: number;
}

/** Sparkline 数据点 */
interface SparklinePoint {
  date: string;
  value: number;
}

/** 周期 sparkline 数据 */
interface PeriodSparklines {
  '7d': SparklinePoint[];
  '30d': SparklinePoint[];
}

/** 模块数据 */
interface ModulesData {
  revenue: { mrr: number; arppu: number; payingUsers: number };
  activity: { dauMauRatio: number; wau: number; mau: number };
  funnel: { visitors: number; registered: number; active: number; paid: number };
  subscription: { newSubs: number; churned: number; churnRate: number };
  traffic: { pv: number; uv: number; exposure: number };
  experts: { name: string; count: number }[];
}

/** Sparklines 集合 */
interface SparklinesData {
  revenue: PeriodSparklines;
  dau: PeriodSparklines;
  messages: PeriodSparklines;
  newUsers: PeriodSparklines;
  netSubs: PeriodSparklines;
  pv: PeriodSparklines;
  uv: PeriodSparklines;
  mrr: PeriodSparklines;
}

/** API 完整响应 */
interface OverviewResponse {
  realtime: RealtimeData;
  modules: ModulesData;
  sparklines: SparklinesData;
}

/** 模块名称到 sparkline key 的映射 */
type ModuleKey = 'revenue' | 'activity' | 'funnel' | 'subscription' | 'traffic' | 'experts';
type Period = '7d' | '30d';

// ─── 格式化工具函数 ───

/** 格式化金额为 $ 前缀字符串 */
function fmtCurrency(value: number): string {
  if (value >= 1000) {
    return '$' + (value / 1000).toFixed(1) + 'k';
  }
  return '$' + value.toFixed(2);
}

/** 格式化大数字 */
function fmtNumber(value: number): string {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'k';
  return value.toLocaleString();
}

/** 格式化百分比 */
function fmtPercent(value: number): string {
  return value.toFixed(1) + '%';
}

/** 计算漏斗层宽度（相对于最大层） */
function calcFunnelWidth(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(5, (value / max) * 100);
}

// ─── 图标 SVG 组件（内联简化） ───

/** 收入图标 */
const IconRevenue = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

/** 活跃用户图标 */
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

/** 转化漏斗图标 */
const IconFunnel = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

/** 订阅健康图标 */
const IconHeart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

/** 流量图标 */
const IconGlobe = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

/** 专家图标 */
const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

/** 消息图标 */
const IconMessage = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

// ─── 主组件 ───

export default function DashboardClient() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 各模块的周期切换状态（独立管理）
  const [periods, setPeriods] = useState<Record<ModuleKey, Period>>({
    revenue: '7d',
    activity: '7d',
    funnel: '7d',
    subscription: '7d',
    traffic: '7d',
    experts: '7d',
  });

  /** 切换某个模块的时间周期 */
  const handlePeriodChange = useCallback((module: ModuleKey, period: Period) => {
    setPeriods((prev) => ({ ...prev, [module]: period }));
  }, []);

  /** 获取数据 */
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/admin/dashboard/overview');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || '获取数据失败');
        }
        const json: OverviewResponse = await res.json();
        if (!cancelled) setData(json);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '未知错误';
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, []);

  // ─── 加载态 ───
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#2D2D44', borderTopColor: 'transparent' }}
          />
          <span style={{ color: '#9CA3AF' }}>加载仪表盘数据...</span>
        </div>
      </div>
    );
  }

  // ─── 错误态 ───
  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p style={{ color: '#EF4444' }} className="mb-2">加载失败</p>
          <p style={{ color: '#9CA3AF' }} className="text-sm">{error || '未获取到数据'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-md text-sm"
            style={{ backgroundColor: '#2D2D44', color: '#E0E0E0' }}
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  const { realtime, modules, sparklines } = data;

  // ─── 漏斗数据 ───
  const funnelLayers: FunnelStep[] = [
    { label: '游客', value: modules.funnel.visitors, color: '#6B7280' },
    { label: '注册', value: modules.funnel.registered, color: '#3B82F6' },
    { label: '活跃', value: modules.funnel.active, color: '#22C55E' },
    { label: '付费', value: modules.funnel.paid, color: '#F59E0B' },
  ];
  const maxFunnelValue = Math.max(...funnelLayers.map((f) => f.value), 1);

  // ─── 专家数据 ───
  const expertBars: ExpertBar[] = (modules.experts || []).map((e, i) => ({
    name: e.name,
    count: e.count,
    color: ['#3B82F6', '#22C55E', '#8B5CF6', '#F59E0B'][i % 4],
  }));
  const maxExpertCount = Math.max(...expertBars.map((e) => e.count), 1);

  return (
    <div className="space-y-6" style={{ backgroundColor: '#1A1A2E', color: '#E0E0E0', minHeight: '100vh' }}>
      {/* ─── 页面标题 ─── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: '#E0E0E0' }}>
          综合仪表盘
        </h1>
        <span className="text-xs" style={{ color: '#6B7280' }}>
          数据更新于 {new Date().toLocaleTimeString('zh-CN')}
        </span>
      </div>

      {/* ============================================================ */}
      {/* 第一行：实时指标栏（5 卡片，grid-cols-5） */}
      {/* ============================================================ */}
      <div className="grid grid-cols-5 gap-4">
        {/* 今日收入 */}
        <RealtimeCard
          title="今日收入"
          value={fmtCurrency(realtime.todayRevenue)}
          change={realtime.revenueChange}
          sparklineData={sparklines.revenue[periods.revenue]}
          sparklineColor="#22C55E"
          prefix="$"
        />

        {/* 今日新增用户 */}
        <RealtimeCard
          title="今日新增"
          value={realtime.todayNewUsers.toLocaleString()}
          change={realtime.newUsersChange}
          sparklineData={sparklines.newUsers[periods.revenue]}
          sparklineColor="#3B82F6"
        />

        {/* 今日活跃用户 */}
        <RealtimeCard
          title="今日活跃"
          value={realtime.todayDAU.toLocaleString()}
          change={realtime.dauChange}
          sparklineData={sparklines.dau[periods.revenue]}
          sparklineColor="#8B5CF6"
        />

        {/* 今日消息数 */}
        <RealtimeCard
          title="今日消息"
          value={realtime.todayMessages.toLocaleString()}
          change={realtime.messagesChange}
          sparklineData={sparklines.messages[periods.revenue]}
          sparklineColor="#F59E0B"
        />

        {/* 当前在线 */}
        <RealtimeCard
          title="当前在线"
          value={realtime.onlineNow.toLocaleString()}
          indicator="pulse"
        />
      </div>

      {/* ============================================================ */}
      {/* 第二行起：模块概览区（6 卡片，grid-cols-2 × 3 行） */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 gap-4">
        {/* ─── 收入概览 ─── */}
        <ModuleCard
          title="收入概览"
          icon={<IconRevenue />}
          metrics={[
            { label: 'MRR', value: fmtCurrency(modules.revenue.mrr) },
            { label: 'ARPPU', value: fmtCurrency(modules.revenue.arppu) },
            { label: '付费用户', value: modules.revenue.payingUsers.toLocaleString() },
          ]}
          sparklineData={sparklines.mrr[periods.revenue]}
          sparklineColor="#22C55E"
          href="/admin/revenue"
          period={periods.revenue}
          onPeriodChange={(p) => handlePeriodChange('revenue', p)}
        />

        {/* ─── 用户活跃 ─── */}
        <ModuleCard
          title="用户活跃"
          icon={<IconUsers />}
          metrics={[
            { label: 'DAU/MAU', value: fmtPercent(modules.activity.dauMauRatio), color: '#22C55E' },
            { label: 'WAU', value: fmtNumber(modules.activity.wau) },
            { label: 'MAU', value: fmtNumber(modules.activity.mau) },
          ]}
          sparklineData={sparklines.dau[periods.activity]}
          sparklineColor="#3B82F6"
          href="/admin/behavior?tab=activity"
          period={periods.activity}
          onPeriodChange={(p) => handlePeriodChange('activity', p)}
        />

        {/* ─── 转化漏斗 — 自定义漏斗压缩条 ─── */}
        <ModuleCard
          title="转化漏斗"
          icon={<IconFunnel />}
          metrics={[
            { label: '游客→注册', value: fmtPercent(modules.funnel.visitors > 0 ? (modules.funnel.registered / modules.funnel.visitors) * 100 : 0) },
            { label: '注册→活跃', value: fmtPercent(modules.funnel.registered > 0 ? (modules.funnel.active / modules.funnel.registered) * 100 : 0) },
          ]}
          href="/admin/revenue?tab=funnel"
          chartSlot={
            <div className="flex flex-col gap-1.5 py-2">
              {funnelLayers.map((layer) => (
                <div key={layer.label} className="flex items-center gap-2">
                  <span className="text-xs w-10 text-right" style={{ color: '#9CA3AF' }}>
                    {layer.label}
                  </span>
                  <div className="flex-1 h-5 rounded-sm relative" style={{ backgroundColor: '#1A1A2E' }}>
                    <div
                      className="h-full rounded-sm absolute left-0 top-0 transition-all"
                      style={{
                        width: `${calcFunnelWidth(layer.value, maxFunnelValue)}%`,
                        backgroundColor: layer.color || '#3B82F6',
                      }}
                    />
                  </div>
                  <span className="text-xs w-12" style={{ color: '#E0E0E0' }}>
                    {fmtNumber(layer.value)}
                  </span>
                </div>
              ))}
            </div>
          }
        />

        {/* ─── 订阅健康 ─── */}
        <ModuleCard
          title="订阅健康"
          icon={<IconHeart />}
          metrics={[
            { label: '今日新增', value: modules.subscription.newSubs.toLocaleString(), color: '#22C55E' },
            { label: '今日流失', value: modules.subscription.churned.toLocaleString(), color: '#EF4444' },
            { label: '流失率', value: fmtPercent(modules.subscription.churnRate), color: modules.subscription.churnRate > 5 ? '#EF4444' : '#22C55E' },
          ]}
          sparklineData={sparklines.netSubs[periods.subscription]}
          sparklineColor={sparklines.netSubs[periods.subscription]?.length > 0 ? '#3B82F6' : '#6B7280'}
          href="/admin/revenue?tab=churn"
          period={periods.subscription}
          onPeriodChange={(p) => handlePeriodChange('subscription', p)}
        />

        {/* ─── 流量概览 — 双线 PV+UV ─── */}
        <ModuleCard
          title="流量概览"
          icon={<IconGlobe />}
          metrics={[
            { label: 'PV', value: fmtNumber(modules.traffic.pv) },
            { label: 'UV', value: fmtNumber(modules.traffic.uv) },
            { label: '曝光', value: fmtNumber(modules.traffic.exposure) },
          ]}
          sparklineData={sparklines.pv[periods.traffic]}
          sparklineColor="#3B82F6"
          sparklineData2={sparklines.uv[periods.traffic]}
          sparklineColor2="#F59E0B"
          href="/admin/traffic"
          period={periods.traffic}
          onPeriodChange={(p) => handlePeriodChange('traffic', p)}
        />

        {/* ─── 专家热度 — 横条图 ─── */}
        <ModuleCard
          title="专家热度"
          icon={<IconStar />}
          metrics={[
            { label: '总对话', value: expertBars.reduce((s, e) => s + e.count, 0).toLocaleString() },
          ]}
          href="/admin/behavior?tab=experts"
          chartSlot={
            <div className="flex flex-col gap-2 py-2">
              {expertBars.map((expert) => (
                <div key={expert.name} className="flex items-center gap-2">
                  <span className="text-xs w-16 truncate" style={{ color: '#E0E0E0' }}>
                    {expert.name}
                  </span>
                  <div className="flex-1 h-5 rounded-sm relative" style={{ backgroundColor: '#1A1A2E' }}>
                    <div
                      className="h-full rounded-sm absolute left-0 top-0 transition-all"
                      style={{
                        width: `${maxExpertCount > 0 ? (expert.count / maxExpertCount) * 100 : 0}%`,
                        backgroundColor: expert.color || '#3B82F6',
                      }}
                    />
                  </div>
                  <span className="text-xs w-10 text-right" style={{ color: '#9CA3AF' }}>
                    {fmtNumber(expert.count)}
                  </span>
                </div>
              ))}
            </div>
          }
        />
      </div>
    </div>
  );
}

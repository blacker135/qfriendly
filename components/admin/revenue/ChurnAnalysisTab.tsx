'use client';
// components/admin/revenue/ChurnAnalysisTab.tsx
// 流失分析 Tab — 展示流失率指标 + 新增vs流失对比 + 按方案流失 + 留存曲线 + 升级/降级分析
// 数据来源: GET /api/admin/revenue/churn

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line,
} from 'recharts';

/** 日期范围参数 */
interface DateRangeParam {
  start: string;
  end: string;
  preset: string;
}

/** 按方案流失数据 */
interface ChurnByPlanItem {
  plan: string;
  churned: number;
  total: number;
  rate: number;
}

/** 留存曲线数据点 */
interface RetentionPoint {
  months: number;
  retentionRate: number;
}

/** 流失 API 响应完整类型 */
interface ChurnApiData {
  churnRate: number;
  revenueChurnRate: number;
  churnedUsers: number;
  newPayingUsers: number;
  churnByPlan: ChurnByPlanItem[];
  churnByDuration: RetentionPoint[];
  upgrades: number;
  downgrades: number;
  upgradeRate: number;
}

interface ChurnAnalysisTabProps {
  dateRange: DateRangeParam;
}

/** 深色主题 Tooltip 样式 */
const darkTooltipStyle = {
  backgroundColor: '#1F2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#F9FAFB',
};

/** 方案配色 */
const PLAN_COLORS: Record<string, string> = {
  start: '#3B82F6',
  pro: '#22C55E',
  ultra: '#8B5CF6',
};

/** 流失率告警级别 */
function getChurnSeverity(rate: number): { color: string; label: string } {
  if (rate <= 5) return { color: '#22C55E', label: '健康' };
  if (rate <= 10) return { color: '#F59E0B', label: '注意' };
  return { color: '#EF4444', label: '告警' };
}

export default function ChurnAnalysisTab({ dateRange }: ChurnAnalysisTabProps) {
  const [data, setData] = useState<ChurnApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从对应 API 端点拉取数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
        const res = await fetch(`/api/admin/revenue/churn?${params}`);
        if (!res.ok) throw new Error('获取流失分析失败');
        const json: ChurnApiData = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [dateRange.start, dateRange.end]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-400">{error || '暂无数据'}</p>
      </div>
    );
  }

  const churnSeverity = getChurnSeverity(data.churnRate);
  const revenueSeverity = getChurnSeverity(data.revenueChurnRate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-6"
    >
      {/* ---- 流失率核心指标卡片 ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 客户流失率 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <p className="text-xs text-gray-400">客户流失率</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <p className="text-2xl font-bold text-gray-200">{data.churnRate.toFixed(1)}%</p>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: churnSeverity.color, backgroundColor: `${churnSeverity.color}20` }}>
              {churnSeverity.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            流失 {data.churnedUsers} 人，新增 {data.newPayingUsers} 人
          </p>
        </div>

        {/* 收入流失率 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <p className="text-xs text-gray-400">收入流失率</p>
          <div className="flex items-baseline gap-2 mt-1.5">
            <p className="text-2xl font-bold text-gray-200">{data.revenueChurnRate.toFixed(1)}%</p>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: revenueSeverity.color, backgroundColor: `${revenueSeverity.color}20` }}>
              {revenueSeverity.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">流失订阅的 MRR 占比</p>
        </div>

        {/* 流失用户数 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <p className="text-xs text-gray-400">流失用户</p>
          <p className="mt-1.5 text-2xl font-bold text-red-400">{data.churnedUsers.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">当前期间取消/过期</p>
        </div>

        {/* 升级率 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <p className="text-xs text-gray-400">升级率</p>
          <p className="mt-1.5 text-2xl font-bold text-green-400">{data.upgradeRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500 mt-1">
            升级 {data.upgrades} 次，降级 {data.downgrades} 次
          </p>
        </div>
      </div>

      {/* ---- 新增 vs 流失对比柱状图 ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">新增 vs 流失</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { name: '新增付费', value: data.newPayingUsers, fill: '#22C55E' },
              { name: '流失', value: data.churnedUsers, fill: '#EF4444' },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={darkTooltipStyle} formatter={(value) => [Number(value), '人数']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <Cell fill="#22C55E" />
                <Cell fill="#EF4444" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 按方案流失率柱状图 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">按方案流失率</h3>
          {data.churnByPlan.length === 0 ? (
            <p className="text-center text-gray-500 py-12">暂无数据</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.churnByPlan}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="plan"
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(plan: string) => plan.charAt(0).toUpperCase() + plan.slice(1)}
                />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  contentStyle={darkTooltipStyle}
                  formatter={(value, name) => {
                    const nameStr = String(name ?? '');
                    if (nameStr === 'rate') return [`${Number(value).toFixed(1)}%`, '流失率'];
                    if (nameStr === 'churned') return [Number(value), '流失人数'];
                    return [Number(value), nameStr];
                  }}
                />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {data.churnByPlan.map((item, i) => (
                    <Cell key={i} fill={PLAN_COLORS[item.plan] || '#6B7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ---- 下半区: 留存曲线 + 升级/降级摘要 ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 留存曲线 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">用户留存曲线</h3>
          {data.churnByDuration.length === 0 ? (
            <p className="text-center text-gray-500 py-12">暂无留存数据</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.churnByDuration}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="months"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(m: number) => `${m}月`}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={darkTooltipStyle}
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, '留存率']}
                />
                <Line
                  type="monotone"
                  dataKey="retentionRate"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#8B5CF6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 升级/降级分析卡片 */}
        <div className="space-y-4">
          <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">升级 / 降级分析</h3>
            <div className="space-y-3">
              {/* 升级 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">升级次数</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-green-400">{data.upgrades}</span>
                  {data.upgrades > 0 && (
                    <span className="text-xs text-green-400/70">▲</span>
                  )}
                </div>
              </div>
              {/* 降级 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">降级次数</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-yellow-400">{data.downgrades}</span>
                  {data.downgrades > 0 && (
                    <span className="text-xs text-yellow-400/70">▼</span>
                  )}
                </div>
              </div>
              {/* 升级率 */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <span className="text-sm text-gray-400">升级率</span>
                <span className="text-sm font-semibold text-gray-200">{data.upgradeRate.toFixed(1)}%</span>
              </div>
              {/* 净增变化 */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <span className="text-sm text-gray-400">净变化</span>
                <span className={`text-sm font-semibold ${data.upgrades - data.downgrades >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.upgrades - data.downgrades >= 0 ? '+' : ''}{data.upgrades - data.downgrades}
                </span>
              </div>
            </div>
          </div>

          {/* 按方案流失明细表 */}
          <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">方案流失明细</h3>
            {data.churnByPlan.length === 0 ? (
              <p className="text-center text-gray-500 py-6 text-sm">暂无数据</p>
            ) : (
              <div className="space-y-2">
                {/* 表头 */}
                <div className="flex text-xs text-gray-500 pb-2 border-b border-gray-700">
                  <span className="flex-1">方案</span>
                  <span className="w-20 text-right">流失/总</span>
                  <span className="w-16 text-right">流失率</span>
                </div>
                {/* 数据行 */}
                {data.churnByPlan.map((item) => {
                  const severity = getChurnSeverity(item.rate);
                  return (
                    <div key={item.plan} className="flex text-xs py-1.5">
                      <span className="flex-1 text-gray-300">
                        {item.plan.charAt(0).toUpperCase() + item.plan.slice(1)}
                      </span>
                      <span className="w-20 text-right text-gray-400">
                        {item.churned}/{item.total === 0 ? '-' : item.total.toLocaleString()}
                      </span>
                      <span className="w-16 text-right" style={{ color: severity.color }}>
                        {item.rate.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

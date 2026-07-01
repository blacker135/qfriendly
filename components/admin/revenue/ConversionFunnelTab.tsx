'use client';
// components/admin/revenue/ConversionFunnelTab.tsx
// 转化漏斗 Tab — 展示全站转化漏斗横条图 + 转化率趋势 + 平均转化时长 + 方案选择分布
// 数据来源: GET /api/admin/revenue/funnel

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import FunnelBar from './FunnelBar';
import type { FunnelStage } from './FunnelBar';

/** 日期范围参数 */
interface DateRangeParam {
  start: string;
  end: string;
  preset: string;
}

/** 漏斗数据 */
interface FunnelData {
  visitors: number;
  visitorToRegister: number;
  registrations: number;
  registerToActive: number;
  active: number;
  activeToPaid: number;
  paid: number;
  continuouslyPaid: number;
}

/** 方案分布项 */
interface PlanDistItem {
  plan: string;
  count: number;
}

/** 漏斗 API 响应完整类型 */
interface FunnelApiData {
  funnel: FunnelData;
  trialToPaidDays: number;
  planDistribution: PlanDistItem[];
}

interface ConversionFunnelTabProps {
  dateRange: DateRangeParam;
}

/** 深色主题 Tooltip 样式 */
const darkTooltipStyle = {
  backgroundColor: '#1F2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#F9FAFB',
};

/** 方案柱状图配色 */
const PLAN_BAR_COLORS: Record<string, string> = {
  start: '#3B82F6',
  pro: '#22C55E',
  ultra: '#8B5CF6',
  admin: '#F59E0B',
};

export default function ConversionFunnelTab({ dateRange }: ConversionFunnelTabProps) {
  const [data, setData] = useState<FunnelApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从对应 API 端点拉取数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
        const res = await fetch(`/api/admin/revenue/funnel?${params}`);
        if (!res.ok) throw new Error('获取转化漏斗失败');
        const json: FunnelApiData = await res.json();
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

  const { funnel, trialToPaidDays, planDistribution } = data;

  // 构建漏斗横条图所需的层级数据
  const funnelStages: FunnelStage[] = [
    { label: '访客', count: funnel.visitors, rate: funnel.visitorToRegister },
    { label: '注册', count: funnel.registrations, rate: funnel.registerToActive },
    { label: '活跃', count: funnel.active, rate: funnel.activeToPaid },
    { label: '付费', count: funnel.paid, rate: funnel.continuouslyPaid ? 100 : 0 },
    { label: '持续付费', count: funnel.continuouslyPaid },
  ];

  // 转化率卡片数据
  const conversionCards = [
    { label: '访客 → 注册', rate: funnel.visitorToRegister, color: '#3B82F6' },
    { label: '注册 → 活跃', rate: funnel.registerToActive, color: '#22C55E' },
    { label: '活跃 → 付费', rate: funnel.activeToPaid, color: '#8B5CF6' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-6"
    >
      {/* ---- 转化率指标卡片 ---- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {conversionCards.map((card) => (
          <div key={card.label} className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
            <p className="text-xs text-gray-400">{card.label}</p>
            <p className="mt-1.5 text-2xl font-bold text-gray-200">{card.rate.toFixed(1)}%</p>
            {/* 迷你进度条 */}
            <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(card.rate, 100)}%`, backgroundColor: card.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ---- 漏斗横条图 ---- */}
      <FunnelBar stages={funnelStages} />

      {/* ---- 下半区: 平均转化时长 + 方案分布 ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 平均转化时长卡片 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">试用到付费平均时长</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-200">
              {trialToPaidDays.toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">天</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            从注册到首次付费的平均天数
          </p>
        </div>

        {/* 新订阅方案选择分布柱状图 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">新订阅方案分布</h3>
          {planDistribution.length === 0 ? (
            <p className="text-center text-gray-500 py-12">暂无数据</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={planDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="plan"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  // 格式化方案名首字母大写
                  tickFormatter={(plan: string) => plan.charAt(0).toUpperCase() + plan.slice(1)}
                />
                <Tooltip contentStyle={darkTooltipStyle} formatter={(value) => [Number(value), '订阅数']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {planDistribution.map((item, i) => (
                    <Cell key={i} fill={PLAN_BAR_COLORS[item.plan] || '#6B7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </motion.div>
  );
}

'use client';
// components/admin/revenue/RevenueOverviewTab.tsx
// 收入概览 Tab — 展示 KPI 卡片 + MRR 瀑布图 + MRR 趋势 + 方案占比 + LTV
// 数据来源: GET /api/admin/revenue/overview

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import MRRWaterfall from './MRRWaterfall';

/** 日期范围参数（与父页面 DateRangePicker 一致） */
interface DateRangeParam {
  start: string;
  end: string;
  preset: string;
}

/** 方案 MRR 占比数据 */
interface PlanShare {
  dates: string[];
  start: number[];
  pro: number[];
  ultra: number[];
}

/** LTV 数据 */
interface LTV {
  total: number;
  start: number;
  pro: number;
  ultra: number;
}

/** 瀑布图数据 */
interface WaterfallData {
  startingMRR: number;
  newMRR: number;
  expansionMRR: number;
  churnedMRR: number;
  contractionMRR: number;
  endingMRR: number;
}

/** 概览 API 响应完整类型 */
interface OverviewData {
  mrr: number;
  arr: number;
  waterfall: WaterfallData;
  mrrTrend: { date: string; value: number }[];
  planShare: PlanShare;
  payingUsers: number;
  arppu: number;
  ltv: LTV;
}

interface RevenueOverviewTabProps {
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
  start: '#3B82F6',   // 蓝
  pro: '#22C55E',     // 绿
  ultra: '#8B5CF6',   // 紫
};

export default function RevenueOverviewTab({ dateRange }: RevenueOverviewTabProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从对应 API 端点拉取数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
        const res = await fetch(`/api/admin/revenue/overview?${params}`);
        if (!res.ok) throw new Error('获取收入概览失败');
        const json: OverviewData = await res.json();
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

  // 将 planShare 数据转换为 AreaChart 所需的格式
  const planShareData = data.planShare.dates.map((date, i) => ({
    date,
    Start: data.planShare.start[i] ?? 0,
    Pro: data.planShare.pro[i] ?? 0,
    Ultra: data.planShare.ultra[i] ?? 0,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-6"
    >
      {/* ---- KPI 指标卡片行 ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="MRR (月经常性收入)" value={`$${data.mrr.toFixed(2)}`} subtitle="本月 MRR 总额" color="#3B82F6" />
        <KpiCard title="ARR (年经常性收入)" value={`$${data.arr.toFixed(2)}`} subtitle="年化收入" color="#22C55E" />
        <KpiCard title="付费用户" value={data.payingUsers.toLocaleString()} subtitle="活跃订阅用户" color="#8B5CF6" />
        <KpiCard title="ARPPU" value={`$${data.arppu.toFixed(2)}`} subtitle="每付费用户平均收入" color="#F59E0B" />
      </div>

      {/* ---- 主区域: 瀑布图 + LTV 卡 ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MRRWaterfall data={data.waterfall} />
        </div>
        {/* LTV 估算卡片 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">LTV 估算</h3>
          <div className="space-y-3">
            <PlanLTVRow label="综合" value={data.ltv.total} showDivider />
            <PlanLTVRow label="Start" value={data.ltv.start} />
            <PlanLTVRow label="Pro" value={data.ltv.pro} />
            <PlanLTVRow label="Ultra" value={data.ltv.ultra} />
          </div>
        </div>
      </div>

      {/* ---- MRR 趋势折线图 ---- */}
      <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">MRR 趋势</h3>
        {data.mrrTrend.length === 0 ? (
          <p className="text-center text-gray-500 py-12">暂无趋势数据</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.mrrTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={darkTooltipStyle} formatter={(value) => [`$${Number(value).toFixed(2)}`, 'MRR']} />
              <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ---- 方案 MRR 占比堆叠面积图 ---- */}
      <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">方案 MRR 占比</h3>
        {planShareData.length === 0 ? (
          <p className="text-center text-gray-500 py-12">暂无占比数据</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={planShareData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={darkTooltipStyle} formatter={(value) => [`$${Number(value).toFixed(2)}`, '']} />
              <Area type="monotone" dataKey="Start" stackId="1" stroke={PLAN_COLORS.start} fill={PLAN_COLORS.start} fillOpacity={0.6} />
              <Area type="monotone" dataKey="Pro" stackId="1" stroke={PLAN_COLORS.pro} fill={PLAN_COLORS.pro} fillOpacity={0.6} />
              <Area type="monotone" dataKey="Ultra" stackId="1" stroke={PLAN_COLORS.ultra} fill={PLAN_COLORS.ultra} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================
// 内部子组件
// ============================================================

/** 单个 KPI 指标卡片 */
function KpiCard({ title, value, subtitle, color }: {
  title: string; value: string; subtitle: string; color: string;
}) {
  return (
    <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors">
      <p className="text-xs text-gray-400">{title}</p>
      <p className="mt-1.5 text-2xl font-bold text-gray-200">{value}</p>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

/** 单一方案的 LTV 行 */
function PlanLTVRow({ label, value, showDivider }: {
  label: string; value: number; showDivider?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-2 ${showDivider ? 'border-b border-gray-700' : ''}`}>
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-200">${value.toFixed(2)}</span>
    </div>
  );
}

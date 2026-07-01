'use client';
// components/admin/behavior/DepthTab.tsx
// 对话深度 Tab — 展示日均消息数趋势 + 人均会话消息数 + 完成率 + 平均轮次
// 数据来源: GET /api/admin/behavior/depth

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';

/** 日期范围参数 */
interface DateRangeParam {
  start: string;
  end: string;
  preset: string;
}

/** 对话深度 API 响应完整类型 */
interface DepthData {
  dailyMessages: { date: string; count: number }[];
  avgMessagesPerConversation: number;
  completionRate: number;
  avgTurns: number;
  avgDailyMessageCount: number;
}

interface DepthTabProps {
  dateRange: DateRangeParam;
}

/** 深色主题 Tooltip 样式 */
const darkTooltipStyle = {
  backgroundColor: '#1F2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#F9FAFB',
};

export default function DepthTab({ dateRange }: DepthTabProps) {
  const [data, setData] = useState<DepthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
        const res = await fetch(`/api/admin/behavior/depth?${params}`);
        if (!res.ok) throw new Error('获取对话深度数据失败');
        const json: DepthData = await res.json();
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-6"
    >
      {/* ---- KPI 指标卡片行 ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="日均消息数" value={data.avgDailyMessageCount.toFixed(1)} subtitle="平均每天用户消息" color="#3B82F6" />
        <KpiCard title="人均会话消息数" value={data.avgMessagesPerConversation.toFixed(1)} subtitle="每次对话平均消息" color="#22C55E" />
        <KpiCard title="对话完成率" value={`${data.completionRate.toFixed(1)}%`} subtitle=">1条用户消息的对话占比" color="#8B5CF6" />
        <KpiCard title="平均轮次" value={data.avgTurns.toFixed(1)} subtitle="用户↔AI 往返次数" color="#F59E0B" />
      </div>

      {/* ---- 每日消息量趋势面积图 ---- */}
      <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">每日消息量趋势</h3>
        {data.dailyMessages.length === 0 ? (
          <p className="text-center text-gray-500 py-12">暂无趋势数据</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.dailyMessages}>
              <defs>
                <linearGradient id="messageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={darkTooltipStyle} formatter={(value) => [Number(value).toLocaleString(), '消息数']} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#messageGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#3B82F6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ---- 对话深度分布说明 ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">对话深度概览</h3>
          <div className="space-y-4">
            <MetricBar label="人均消息数" value={data.avgMessagesPerConversation} max={20} color="#3B82F6" suffix=" 条/会话" />
            <MetricBar label="对话完成率" value={data.completionRate} max={100} color="#22C55E" suffix="%" />
            <MetricBar label="平均轮次" value={data.avgTurns} max={10} color="#8B5CF6" suffix=" 轮/会话" />
          </div>
        </div>

        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5 flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-400">{data.avgDailyMessageCount.toFixed(1)}</p>
            <p className="text-sm text-gray-400 mt-2">日均消息数</p>
            <p className="text-xs text-gray-500 mt-1">所选时间范围内的平均值</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

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

/** 指标进度条 */
function MetricBar({ label, value, max, color, suffix }: {
  label: string; value: number; max: number; color: string; suffix: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm font-semibold text-gray-200">
          {value.toFixed(1)}{suffix}
        </span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

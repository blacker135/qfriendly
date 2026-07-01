'use client';
// components/admin/behavior/ActivityTab.tsx
// 活跃度 Tab — 展示 DAU/WAU/MAU KPI 卡片 + 粘性指标 + 会话趋势 + 会话时长
// 数据来源: GET /api/admin/behavior/activity

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import KpiCard from '@/components/admin/shared/KpiCard';

/** 日期范围参数（与父页面 DateRangePicker 一致） */
interface DateRangeParam {
  start: string;
  end: string;
  preset: string;
}

/** 活跃度 API 响应完整类型 */
interface ActivityData {
  dau: number;
  wau: number;
  mau: number;
  dauMauRatio: number;
  dailySessions: { date: string; count: number }[];
  avgSessionDuration: number;
  avgSessionsPerUser: number;
}

interface ActivityTabProps {
  dateRange: DateRangeParam;
}

/** 深色主题 Tooltip 样式 */
const darkTooltipStyle = {
  backgroundColor: '#1F2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#F9FAFB',
};

export default function ActivityTab({ dateRange }: ActivityTabProps) {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
        const res = await fetch(`/api/admin/behavior/activity?${params}`);
        if (!res.ok) throw new Error('获取活跃度数据失败');
        const json: ActivityData = await res.json();
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
        <KpiCard title="DAU (日活跃用户)" value={data.dau.toLocaleString()} subtitle="今日活跃用户" color="#3B82F6" />
        <KpiCard title="WAU (周活跃用户)" value={data.wau.toLocaleString()} subtitle="过去 7 天活跃用户" color="#22C55E" />
        <KpiCard title="MAU (月活跃用户)" value={data.mau.toLocaleString()} subtitle="过去 30 天活跃用户" color="#8B5CF6" />
        <KpiCard title="粘性 (DAU/MAU)" value={`${data.dauMauRatio.toFixed(1)}%`} subtitle="日活占月活比例" color="#F59E0B" />
      </div>

      {/* ---- 第二行 KPI 卡片 ---- */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard title="平均会话时长" value={`${data.avgSessionDuration.toFixed(1)} 分钟`} subtitle="每次会话平均时长" color="#EC4899" />
        <KpiCard title="人均日会话数" value={data.avgSessionsPerUser.toFixed(2)} subtitle="每日每用户会话数" color="#14B8A6" />
        <KpiCard title="今日会话总数" value={data.dailySessions[data.dailySessions.length - 1]?.count?.toLocaleString() ?? '0'} subtitle="最新日期的会话数" color="#F97316" />
      </div>

      {/* ---- 每日会话趋势折线图 ---- */}
      <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">每日会话趋势</h3>
        {data.dailySessions.length === 0 ? (
          <p className="text-center text-gray-500 py-12">暂无趋势数据</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.dailySessions}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={darkTooltipStyle} formatter={(value) => [Number(value).toLocaleString(), '会话数']} />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}


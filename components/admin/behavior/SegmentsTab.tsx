'use client';
// components/admin/behavior/SegmentsTab.tsx
// 用户分层 Tab — 展示活跃度分层饼图 + 占比趋势 + 生命周期分布
// 数据来源: GET /api/admin/behavior/segments

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

/** 日期范围参数 */
interface DateRangeParam {
  start: string;
  end: string;
  preset: string;
}

/** 分层层级 */
interface SegmentItem {
  segment: string;
  label: string;
  count: number;
  color: string;
}

/** 各层占比趋势数据点 */
interface SegmentTrendPoint {
  week: string;
  highActive: number;
  mediumActive: number;
  lowActive: number;
  atRisk: number;
  lost: number;
}

/** 生命周期阶段 */
interface LifecycleStage {
  stage: string;
  label: string;
  count: number;
  color: string;
}

/** 分层 API 响应完整类型 */
interface SegmentsData {
  segments: SegmentItem[];
  segmentTrend: SegmentTrendPoint[];
  lifecycleDistribution: LifecycleStage[];
}

interface SegmentsTabProps {
  dateRange: DateRangeParam;
}

/** 深色主题 Tooltip 样式 */
const darkTooltipStyle = {
  backgroundColor: '#1F2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#F9FAFB',
};

export default function SegmentsTab({ dateRange }: SegmentsTabProps) {
  const [data, setData] = useState<SegmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/behavior/segments');
        if (!res.ok) throw new Error('获取用户分层数据失败');
        const json: SegmentsData = await res.json();
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

  // 各层占比趋势转换为堆积柱状图数据
  const trendData = data.segmentTrend.map((p) => ({
    week: p.week,
    高活: p.highActive,
    中活: p.mediumActive,
    低活: p.lowActive,
    流失风险: p.atRisk,
    已流失: p.lost,
  }));

  // 饼图数据
  const pieData = data.segments.map((s) => ({
    name: s.label,
    value: s.count,
    color: s.color,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-6"
    >
      {/* ---- 活跃度分层饼图 + 用户生命周期分布 ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 活跃度分层饼图 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">活跃度分层</h3>
          {pieData.length === 0 || pieData.every((d) => d.value === 0) ? (
            <p className="text-center text-gray-500 py-12">暂无分层数据</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                  labelLine={{ stroke: '#6B7280' }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={darkTooltipStyle} formatter={(value) => [Number(value).toLocaleString(), '用户数']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 用户生命周期阶段分布 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">用户生命周期阶段</h3>
          {data.lifecycleDistribution.length === 0 || data.lifecycleDistribution.every((d) => d.count === 0) ? (
            <p className="text-center text-gray-500 py-12">暂无生命周期数据</p>
          ) : (
            <div className="space-y-4">
              {data.lifecycleDistribution.map((stage) => (
                <div key={stage.stage} className="flex items-center gap-3">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-sm text-gray-300 flex-1">{stage.label}</span>
                  <span className="text-sm font-semibold text-gray-200">{stage.count.toLocaleString()}</span>
                  <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: stage.color,
                        width: `${data.lifecycleDistribution.reduce((s, x) => s + x.count, 0) > 0
                          ? (stage.count / data.lifecycleDistribution.reduce((s, x) => s + x.count, 0)) * 100
                          : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- 各层占比趋势堆积柱状图 ---- */}
      <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">各层占比趋势（周）</h3>
        {trendData.length === 0 ? (
          <p className="text-center text-gray-500 py-12">暂无趋势数据</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} unit="%" />
              <Tooltip contentStyle={darkTooltipStyle} formatter={(value) => [`${Number(value).toFixed(1)}%`, '']} />
              <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: 12 }} />
              <Bar dataKey="高活" stackId="a" fill="#22C55E" />
              <Bar dataKey="中活" stackId="a" fill="#3B82F6" />
              <Bar dataKey="低活" stackId="a" fill="#F59E0B" />
              <Bar dataKey="流失风险" stackId="a" fill="#F97316" />
              <Bar dataKey="已流失" stackId="a" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
}

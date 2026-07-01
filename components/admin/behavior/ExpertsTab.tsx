'use client';
// components/admin/behavior/ExpertsTab.tsx
// 专家使用 Tab — 展示各专家占比 + 人均消息数 + 切换频率 + 偏好路径
// 数据来源: GET /api/admin/behavior/experts

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

/** 日期范围参数 */
interface DateRangeParam {
  start: string;
  end: string;
  preset: string;
}

/** 专家使用统计项 */
interface ExpertUsage {
  expert: string;
  label: string;
  conversationCount: number;
  messageCount: number;
  color: string;
}

/** 专家人均消息数 */
interface ExpertAvgMessages {
  expert: string;
  label: string;
  avgMessages: number;
  color: string;
}

/** 专家切换路径 */
interface SwitchPath {
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  count: number;
}

/** 专家用户覆盖率 */
interface ExpertReach {
  expert: string;
  label: string;
  userCount: number;
  color: string;
}

/** 专家使用 API 响应完整类型 */
interface ExpertsData {
  expertUsage: ExpertUsage[];
  expertAvgMessages: ExpertAvgMessages[];
  switchFrequency: number;
  switchPaths: SwitchPath[];
  expertUserReach: ExpertReach[];
}

interface ExpertsTabProps {
  dateRange: DateRangeParam;
}

/** 深色主题 Tooltip 样式 */
const darkTooltipStyle = {
  backgroundColor: '#1F2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#F9FAFB',
};

export default function ExpertsTab({ dateRange }: ExpertsTabProps) {
  const [data, setData] = useState<ExpertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
        const res = await fetch(`/api/admin/behavior/experts?${params}`);
        if (!res.ok) throw new Error('获取专家使用数据失败');
        const json: ExpertsData = await res.json();
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

  // 饼图数据：各专家对话数分布
  const pieData = data.expertUsage.map((e) => ({
    name: e.label,
    value: e.conversationCount,
    color: e.color,
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
        <KpiCard
          title="专家切换频率"
          value={`${data.switchFrequency.toFixed(1)}%`}
          subtitle="同一用户对话中切换专家比例"
          color="#3B82F6"
        />
        {data.expertUsage.slice(0, 3).map((e) => (
          <KpiCard
            key={e.expert}
            title={`${e.label} 对话数`}
            value={e.conversationCount.toLocaleString()}
            subtitle={`${e.messageCount.toLocaleString()} 条消息`}
            color={e.color}
          />
        ))}
      </div>

      {/* ---- 主区域：饼图 + 人均消息数对比 ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 各专家对话数占比饼图 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">各专家对话数占比</h3>
          {pieData.length === 0 || pieData.every((d) => d.value === 0) ? (
            <p className="text-center text-gray-500 py-12">暂无专家数据</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                  labelLine={{ stroke: '#6B7280' }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={darkTooltipStyle} formatter={(value) => [Number(value).toLocaleString(), '对话数']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 各专家人均消息数柱状图 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">各专家人均消息数</h3>
          {data.expertAvgMessages.length === 0 ? (
            <p className="text-center text-gray-500 py-12">暂无数据</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.expertAvgMessages} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip contentStyle={darkTooltipStyle} formatter={(value) => [Number(value).toFixed(1), '人均消息数']} />
                <Bar dataKey="avgMessages" radius={[0, 4, 4, 0]}>
                  {data.expertAvgMessages.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ---- 专家偏好切换路径 + 用户覆盖率 ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 偏好切换路径 Top 列表 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">专家偏好切换路径 Top</h3>
          {data.switchPaths.length === 0 ? (
            <p className="text-center text-gray-500 py-12">暂无切换路径数据</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {data.switchPaths.map((path, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-[#1A1A2E] rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-300">{path.fromLabel}</span>
                    <span className="text-gray-500">→</span>
                    <span className="text-gray-300">{path.toLabel}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-400">{path.count} 次</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 各专家用户覆盖率 */}
        <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">各专家用户覆盖率</h3>
          {data.expertUserReach.length === 0 || data.expertUserReach.every((e) => e.userCount === 0) ? (
            <p className="text-center text-gray-500 py-12">暂无覆盖率数据</p>
          ) : (
            <div className="space-y-4">
              {data.expertUserReach.map((e) => (
                <div key={e.expert} className="flex items-center gap-3">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: e.color }} />
                  <span className="text-sm text-gray-300 w-16">{e.label}</span>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: e.color,
                        width: `${Math.max(...data.expertUserReach.map((x) => x.userCount), 1) > 0
                          ? (e.userCount / Math.max(...data.expertUserReach.map((x) => x.userCount), 1)) * 100
                          : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-200 w-10 text-right">{e.userCount}</span>
                </div>
              ))}
            </div>
          )}
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

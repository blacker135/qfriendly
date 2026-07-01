'use client';
// components/admin/dashboard/Sparkline.tsx
// 迷你趋势图 — 基于 Recharts 的紧凑折线图，用于卡片内嵌展示

import { LineChart, Line, ResponsiveContainer } from 'recharts';

/** Sparkline 组件 props */
interface SparklineProps {
  /** 趋势数据点数组 */
  data: { date: string; value: number }[];
  /** 线条颜色，默认蓝色 */
  color?: string;
  /** 图表高度（px），默认 32 */
  height?: number;
}

/**
 * Sparkline — 迷你趋势折线图
 * 无坐标轴、无网格、无数据点标记，纯线条趋势展示
 * 用于 RealtimeCard 和 ModuleCard 内部
 */
export default function Sparkline({ data, color = '#3B82F6', height = 32 }: SparklineProps) {
  // 空数据或无数据时返回空占位
  if (!data || data.length === 0) {
    return <div style={{ height }} />;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          // 关闭动画以提升迷你图渲染性能
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

'use client';
// components/admin/dashboard/RealtimeCard.tsx
// 实时指标卡片 — 展示今日核心指标及与昨日对比，含迷你趋势图

import { motion } from 'framer-motion';
import Sparkline from './Sparkline';

/** 实时指标卡片 props */
interface RealtimeCardProps {
  /** 卡片标题 */
  title: string;
  /** 主指标值（格式化后的字符串，如 "$1,234" 或 "567"） */
  value: string | number;
  /** 与对比周期的变化百分比（正数=上涨，负数=下跌） */
  change?: number;
  /** 对比周期标签，如 "vs 昨日" */
  changeLabel?: string;
  /** 迷你趋势图数据 */
  sparklineData?: { date: string; value: number }[];
  /** 趋势图颜色 */
  sparklineColor?: string;
  /** 特殊指示器类型 */
  indicator?: 'pulse'; // 绿色脉冲圆点（当前在线）
  /** 主指标前缀（如货币符号） */
  prefix?: string;
}

/**
 * RealtimeCard — 实时指标卡片
 * 展示今日核心指标数值，可选显示与昨日对比的涨跌趋势
 * 支持迷你 sparkline 和脉冲指示器（当前在线）
 */
export default function RealtimeCard({
  title,
  value,
  change,
  changeLabel = 'vs 昨日',
  sparklineData,
  sparklineColor = '#3B82F6',
  indicator,
  prefix,
}: RealtimeCardProps) {
  // 判断涨跌方向（三态：涨↑ / 平→ / 跌↓）
  const isUp = (change ?? 0) > 0;
  const isZero = (change ?? 0) === 0;
  const changeColor = isZero ? '#9CA3AF' : isUp ? '#22C55E' : '#EF4444';
  const changeIcon = isZero ? '→' : isUp ? '↑' : '↓';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl p-5 flex flex-col justify-between"
      style={{ backgroundColor: '#2D2D44' }}
    >
      {/* 顶部：标题 + 脉冲指示器 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm" style={{ color: '#9CA3AF' }}>
          {title}
        </span>
        {indicator === 'pulse' && (
          <span
            className="inline-block w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: '#22C55E', boxShadow: '0 0 6px #22C55E' }}
          />
        )}
      </div>

      {/* 中部：主指标数值 */}
      <div className="flex items-baseline gap-1 mb-1">
        {prefix && (
          <span className="text-lg" style={{ color: '#9CA3AF' }}>
            {prefix}
          </span>
        )}
        <span className="text-2xl font-bold" style={{ color: '#E0E0E0' }}>
          {value}
        </span>
      </div>

      {/* 对比变化 */}
      {change !== undefined && (
        <div className="flex items-center gap-1 mb-2">
          <span className="text-xs font-medium" style={{ color: changeColor }}>
            {changeIcon} {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-xs" style={{ color: '#6B7280' }}>
            {changeLabel}
          </span>
        </div>
      )}

      {/* 底部：迷你 sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-auto pt-2">
          <Sparkline data={sparklineData} color={sparklineColor} height={28} />
        </div>
      )}
    </motion.div>
  );
}

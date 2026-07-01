'use client';
// components/admin/dashboard/ModuleCard.tsx
// 模块概览卡片 — 展示各业务模块的关键指标和迷你趋势图，支持 7天/30天 切换

import Link from 'next/link';
import Sparkline from './Sparkline';
import type { ReactNode } from 'react';

/** 单个指标项 */
interface MetricItem {
  /** 指标标签 */
  label: string;
  /** 指标值（格式化后的字符串） */
  value: string | number;
  /** 可选颜色标识 */
  color?: string;
}

/** 专家热度横条数据 */
export interface ExpertBar {
  name: string;
  count: number;
  color?: string;
}

/** 转化漏斗层数据 */
export interface FunnelStep {
  label: string;
  value: number;
  color?: string;
}

/** ModuleCard 组件 props */
interface ModuleCardProps {
  /** 卡片标题 */
  title: string;
  /** 左侧图标（React 元素） */
  icon: ReactNode;
  /** 关键指标列表 */
  metrics: MetricItem[];
  /** 迷你趋势图数据 */
  sparklineData?: { date: string; value: number }[];
  /** 额外迷你趋势图数据（如 UV 双线） */
  sparklineData2?: { date: string; value: number }[];
  /** 第二条线的颜色 */
  sparklineColor2?: string;
  /** 趋势图主色 */
  sparklineColor?: string;
  /** 跳转链接 */
  href: string;
  /** 时间周期切换回调 */
  onPeriodChange?: (period: '7d' | '30d') => void;
  /** 当前选中的周期 */
  period?: '7d' | '30d';
  /** 自定义图表区域（slot，用于漏斗/横条图） */
  chartSlot?: ReactNode;
}

/**
 * ModuleCard — 模块概览卡片
 * 结构：图标+标题+周期切换 | 关键指标 | 迷你图/自定义槽 | 查看详情链接
 */
export default function ModuleCard({
  title,
  icon,
  metrics,
  sparklineData,
  sparklineData2,
  sparklineColor2 = '#F59E0B',
  sparklineColor = '#3B82F6',
  href,
  onPeriodChange,
  period = '7d',
  chartSlot,
}: ModuleCardProps) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col"
      style={{ backgroundColor: '#2D2D44' }}
    >
      {/* 顶部栏：图标 + 标题 + 周期切换按钮组 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* 图标容器 */}
          <span className="text-lg" style={{ color: '#9CA3AF' }}>
            {icon}
          </span>
          <h3 className="text-sm font-semibold" style={{ color: '#E0E0E0' }}>
            {title}
          </h3>
        </div>

        {/* 7天 / 30天 切换按钮组 */}
        {onPeriodChange && (
          <div className="flex rounded-md overflow-hidden" style={{ backgroundColor: '#1A1A2E' }}>
            <button
              onClick={() => onPeriodChange('7d')}
              className="px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: period === '7d' ? '#3B82F6' : 'transparent',
                color: period === '7d' ? '#FFFFFF' : '#9CA3AF',
              }}
            >
              7天
            </button>
            <button
              onClick={() => onPeriodChange('30d')}
              className="px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: period === '30d' ? '#3B82F6' : 'transparent',
                color: period === '30d' ? '#FFFFFF' : '#9CA3AF',
              }}
            >
              30天
            </button>
          </div>
        )}
      </div>

      {/* 中部：关键指标并排展示 */}
      <div className="flex gap-4 mb-3">
        {metrics.map((metric, i) => (
          <div key={i} className="flex-1">
            <p className="text-xs mb-1" style={{ color: '#6B7280' }}>
              {metric.label}
            </p>
            <p
              className="text-lg font-bold"
              style={{ color: metric.color || '#E0E0E0' }}
            >
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* 下部：迷你趋势图 或 自定义图表槽位 */}
      <div className="mb-3" style={{ minHeight: 120 }}>
        {chartSlot ? (
          // 自定义图表（漏斗/横条图）
          chartSlot
        ) : sparklineData && sparklineData.length > 0 ? (
          // 默认迷你折线图（单线或双线）
          <div className="flex flex-col gap-1">
            <Sparkline data={sparklineData} color={sparklineColor} height={50} />
            {sparklineData2 && sparklineData2.length > 0 && (
              <Sparkline data={sparklineData2} color={sparklineColor2} height={50} />
            )}
          </div>
        ) : (
          // 无数据占位
          <div className="flex items-center justify-center h-full">
            <span className="text-xs" style={{ color: '#6B7280' }}>
              暂无数据
            </span>
          </div>
        )}
      </div>

      {/* 底部：查看详情链接 */}
      <Link
        href={href}
        className="text-xs font-medium hover:underline mt-auto pt-2 border-t transition-colors"
        style={{
          color: '#3B82F6',
          borderColor: '#1A1A2E',
        }}
      >
        查看详情 →
      </Link>
    </div>
  );
}

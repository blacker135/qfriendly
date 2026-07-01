'use client';
// components/admin/shared/KpiCard.tsx
// 深色主题 KPI 指标卡片 — 大数字 + 标签 + 副标题
// 被 ActivityTab / DepthTab / ExpertsTab 等多个行为分析 Tab 共用

import { motion } from 'framer-motion';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

export default function KpiCard({ title, value, subtitle, color = '#3B82F6' }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D44] rounded-xl border border-gray-700 p-4"
    >
      <p className="text-xs text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </motion.div>
  );
}

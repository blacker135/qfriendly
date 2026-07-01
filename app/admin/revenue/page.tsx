'use client';
// app/admin/revenue/page.tsx
// 收入分析主页面 — 3 个 Tab（收入概览 / 转化漏斗 / 流失分析）+ Framer Motion 动画
// 复用: DateRangePicker, ExportButton 共享组件

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RevenueOverviewTab from '@/components/admin/revenue/RevenueOverviewTab';
import ConversionFunnelTab from '@/components/admin/revenue/ConversionFunnelTab';
import ChurnAnalysisTab from '@/components/admin/revenue/ChurnAnalysisTab';
import DateRangePicker from '@/components/admin/shared/DateRangePicker';
import ExportButton from '@/components/admin/shared/ExportButton';

/** Tab 配置 */
const TABS = [
  { key: 'overview', label: '收入概览' },
  { key: 'funnel', label: '转化漏斗' },
  { key: 'churn', label: '流失分析' },
] as const;

type TabKey = (typeof TABS)[number]['key'];
type Preset = 'day' | 'month' | 'year' | 'custom';

/** 日期范围默认值 — 本月 */
function getDefaultDateRange(): { start: string; end: string; preset: Preset } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return {
    start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
    end: fmt(today),
    preset: 'month' as Preset,
  };
}

export default function RevenuePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  // 导出相关参数 — 根据当前 Tab 确定导出模块标识
  const exportBody = useMemo(() => ({
    module: 'revenue',
    tab: activeTab,
    start: dateRange.start,
    end: dateRange.end,
  }), [activeTab, dateRange]);

  return (
    <div className="space-y-6">
      {/* ---- 页面头部: 标题 + 日期选择 + 导出 ---- */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-200">收入分析</h1>
        <div className="flex items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <ExportButton label="导出 CSV" apiUrl="/api/admin/reports/export-csv" body={exportBody} />
          <ExportButton label="生成 PDF" apiUrl="/api/admin/reports/generate-pdf" body={{ ...exportBody, type: 'summary' }} />
        </div>
      </div>

      {/* ---- Tab 导航条 — Framer Motion layoutId 下划线动画 ---- */}
      <div className="flex gap-0 border-b border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-6 py-3 text-sm font-medium transition-colors duration-200 ${
              activeTab === tab.key ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <motion.div
                layoutId="revenue-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                transition={{ duration: 0.2 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ---- Tab 内容区 — AnimatePresence 切换动画 ---- */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'overview' && <RevenueOverviewTab dateRange={dateRange} />}
          {activeTab === 'funnel' && <ConversionFunnelTab dateRange={dateRange} />}
          {activeTab === 'churn' && <ChurnAnalysisTab dateRange={dateRange} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

'use client';
// app/admin/behavior/page.tsx
// 用户行为分析主页面 — 4 个 Tab（活跃度 / 用户分层 / 对话深度 / 专家使用）+ Framer Motion 动画
// 复用: DateRangePicker, ExportButton 共享组件

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ActivityTab from '@/components/admin/behavior/ActivityTab';
import SegmentsTab from '@/components/admin/behavior/SegmentsTab';
import DepthTab from '@/components/admin/behavior/DepthTab';
import ExpertsTab from '@/components/admin/behavior/ExpertsTab';
import DateRangePicker from '@/components/admin/shared/DateRangePicker';
import ExportButton from '@/components/admin/shared/ExportButton';

/** Tab 配置 */
const TABS = [
  { key: 'activity', label: '活跃度' },
  { key: 'segments', label: '用户分层' },
  { key: 'depth', label: '对话深度' },
  { key: 'experts', label: '专家使用' },
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

export default function BehaviorPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('activity');
  const [dateRange, setDateRange] = useState(getDefaultDateRange);

  // 导出相关参数 — 根据当前 Tab 确定导出模块标识
  const exportBody = useMemo(() => ({
    module: 'behavior',
    tab: activeTab,
    start: dateRange.start,
    end: dateRange.end,
  }), [activeTab, dateRange]);

  return (
    <div className="space-y-6">
      {/* ---- 页面头部: 标题 + 日期选择 + 导出 ---- */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-200">用户行为分析</h1>
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
                layoutId="behavior-tab-underline"
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
          {activeTab === 'activity' && <ActivityTab dateRange={dateRange} />}
          {activeTab === 'segments' && <SegmentsTab dateRange={dateRange} />}
          {activeTab === 'depth' && <DepthTab dateRange={dateRange} />}
          {activeTab === 'experts' && <ExpertsTab dateRange={dateRange} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

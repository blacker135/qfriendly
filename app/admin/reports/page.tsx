'use client';
// app/admin/reports/page.tsx
// 报表导出页面 — 提供 CSV 数据导出和 PDF 报表生成功能
// 深色主题，与 revenue/behavior 页面风格一致

import { useState } from 'react';
import ReportGenerator from '@/components/admin/reports/ReportGenerator';

/** 导出的模块/tab 选项 — 供 CSV 导出使用 */
const EXPORT_TARGETS = [
  { value: 'dashboard:summary', label: '仪表盘汇总', module: 'dashboard', tab: 'summary' },
  { value: 'revenue:overview', label: '收入概览', module: 'revenue', tab: 'overview' },
  { value: 'revenue:funnel', label: '转化漏斗', module: 'revenue', tab: 'funnel' },
  { value: 'revenue:churn', label: '流失分析', module: 'revenue', tab: 'churn' },
  { value: 'behavior:activity', label: '用户活跃度', module: 'behavior', tab: 'activity' },
  { value: 'behavior:engagement', label: '互动数据', module: 'behavior', tab: 'engagement' },
  { value: 'behavior:segments', label: '用户分群', module: 'behavior', tab: 'segments' },
  { value: 'users:list', label: '用户列表', module: 'users', tab: 'list' },
  { value: 'subscriptions:list', label: '订阅列表', module: 'subscriptions', tab: 'list' },
];

export default function ReportsPage() {
  const [selectedTarget, setSelectedTarget] = useState(EXPORT_TARGETS[0]);

  return (
    <div className="space-y-6">
      {/* ---- 页面头部 ---- */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-200">报表导出</h1>
          <p className="text-sm text-gray-500 mt-1">
            导出数据或生成报表，支持 CSV 和 PDF 格式
          </p>
        </div>
      </div>

      {/* ---- 导出目标选择 ---- */}
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: '#2D2D44' }}
      >
        <h2 className="text-sm font-medium text-gray-400 mb-3">CSV 导出目标</h2>
        <p className="text-xs text-gray-600 mb-3">
          选择 CSV 导出对应的数据模块和指标。PDF 报表始终生成综合报表，不受此选择影响。
        </p>
        <div className="flex flex-wrap gap-2">
          {EXPORT_TARGETS.map((target) => (
            <button
              key={target.value}
              onClick={() => setSelectedTarget(target)}
              className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-200"
              style={{
                backgroundColor:
                  selectedTarget.value === target.value ? '#4A4A6A' : '#1E1E32',
                color:
                  selectedTarget.value === target.value ? '#E0E0E0' : '#888',
                border:
                  selectedTarget.value === target.value
                    ? '1px solid #6B6B9D'
                    : '1px solid transparent',
              }}
            >
              {target.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- 报表生成器 ---- */}
      <ReportGenerator
        exportModule={selectedTarget.module}
        exportTab={selectedTarget.tab}
      />
    </div>
  );
}

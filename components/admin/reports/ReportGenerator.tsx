'use client';
// components/admin/reports/ReportGenerator.tsx
// 报表生成器客户端组件 — 报表类型选择 + CSV 导出 + PDF 报表生成
// PDF 生成使用前端方案: html2canvas 渲染图表截图 + jsPDF 组装多页文档

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// 动态导入 Recharts 图表组件（避免 SSR 报错）
const LineChart = dynamic(
  () => import('recharts').then((mod) => mod.LineChart),
  { ssr: false },
);
const Line = dynamic(
  () => import('recharts').then((mod) => mod.Line),
  { ssr: false },
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis),
  { ssr: false },
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => mod.CartesianGrid),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip),
  { ssr: false },
);
const ResponsiveContainer = dynamic(
  () => import('recharts').then((mod) => mod.ResponsiveContainer),
  { ssr: false },
);
const Legend = dynamic(
  () => import('recharts').then((mod) => mod.Legend),
  { ssr: false },
);

// ====== 类型定义 ======

/** 报表类型 */
type ReportType = 'weekly' | 'monthly' | 'custom';

/** 内容级别 */
type ContentLevel = 'summary' | 'full';

/** 日期范围 */
interface DateRange {
  start: string;
  end: string;
}

/** 概览摘要 */
interface OverviewSummary {
  mrr: number;
  arr: number;
  dau: number;
  payingUsers: number;
  churnRate: number;
}

/** 趋势数据点 */
interface TrendPoint {
  date: string;
  value: number;
}

/** 趋势数据 */
interface Trends {
  mrr: TrendPoint[];
  dau: TrendPoint[];
  messages: TrendPoint[];
}

/** 关键变化 */
interface PeriodChange {
  mrrChange: number;
  dauChange: number;
  messagesChange: number;
  payingUsersChange: number;
  churnRateChange: number;
}

/** PDF 报表数据（来自 API） */
interface ReportData {
  title: string;
  periodLabel: string;
  generatedAt: string;
  overview: OverviewSummary;
  trends: Trends;
  changes: PeriodChange;
  topExperts: { name: string; usageCount: number }[];
  planDistribution: { plan: string; count: number; mrr: number }[];
}

// ====== 工具函数 ======

/** 获取默认日期范围（本月） */
function getDefaultDateRange(): DateRange {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return {
    start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
    end: fmt(today),
  };
}

/** 格式化数字 */
function fmtNum(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

/** 格式化为货币 */
function fmtCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ====== 组件 Props ======

interface ReportGeneratorProps {
  /** 传递当前 tab/module 信息用于 CSV 导出 */
  exportModule?: string;
  exportTab?: string;
}

// ====== 主组件 ======

export default function ReportGenerator({
  exportModule = 'dashboard',
  exportTab = 'summary',
}: ReportGeneratorProps) {
  // ---- 状态 ----
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [contentLevel, setContentLevel] = useState<ContentLevel>('summary');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');

  // ---- 图表截图区域 ref ----
  const chartRef = useRef<HTMLDivElement>(null);

  // ====== 数据获取 ======

  /** 从 PDF API 获取报表数据 */
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatusMsg('正在获取数据...');
    setProgress(10);

    try {
      const res = await fetch('/api/admin/reports/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          ...(reportType === 'custom' ? { start: dateRange.start, end: dateRange.end } : {}),
        }),
      });

      setProgress(40);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '请求失败' }));
        throw new Error(err.error || '请求失败');
      }

      const data: ReportData = await res.json();
      setReportData(data);
      setProgress(50);
      setStatusMsg('数据获取完成，准备生成...');
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取报表数据失败';
      setError(message);
      setStatusMsg('');
      setProgress(0);
      return null;
    } finally {
      setLoading(false);
    }
  }, [reportType, dateRange]);

  // ====== CSV 导出 ======

  /** 导出 CSV */
  const handleExportCSV = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatusMsg('正在导出 CSV...');
    setProgress(20);

    try {
      const res = await fetch('/api/admin/reports/export-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: exportModule,
          tab: exportTab,
          start: dateRange.start,
          end: dateRange.end,
        }),
      });

      setProgress(60);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: '导出失败' }));
        throw new Error(err.error || '导出失败');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // 从 Content-Disposition 提取文件名，或使用默认名称
      const disposition = res.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="?([^"]+)"?/);
      a.download = filenameMatch?.[1] || `export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      setProgress(100);
      setStatusMsg('CSV 导出成功！');
      setTimeout(() => { setProgress(0); setStatusMsg(''); }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出 CSV 失败';
      setError(message);
      setStatusMsg('');
      setProgress(0);
    } finally {
      setLoading(false);
    }
  }, [exportModule, exportTab, dateRange]);

  // ====== PDF 生成 ======

  /** 生成 PDF 报表 */
  const handleGeneratePDF = useCallback(async () => {
    setLoading(true);
    setError(null);
    setStatusMsg('正在生成报表...');
    setProgress(5);

    try {
      // 1. 获取数据
      setStatusMsg('正在获取数据...');
      const data = await fetchReportData();
      if (!data) return; // fetchReportData 内部已设置 error

      setProgress(55);
      setStatusMsg('正在生成 PDF...');

      // 2. 创建 PDF 文档
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let y = 25;

      // ---- 标题页 ----
      pdf.setFillColor(26, 26, 46); // #1A1A2E 深色背景
      pdf.rect(0, 0, pageWidth, 50, 'F');
      pdf.setTextColor(224, 224, 224); // #E0E0E0
      pdf.setFontSize(22);
      pdf.text(data.title, margin, 32);

      // 生成时间和周期
      y = 55;
      pdf.setTextColor(100, 100, 120);
      pdf.setFontSize(10);
      pdf.text(`生成时间: ${new Date(data.generatedAt).toLocaleString('zh-CN')}`, margin, y);
      y += 6;
      pdf.text(`数据周期: ${data.periodLabel}`, margin, y);

      // ---- 分隔线 ----
      y += 4;
      pdf.setDrawColor(45, 45, 68);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 10;

      // ---- 概览摘要 ----
      pdf.setTextColor(224, 224, 224);
      pdf.setFontSize(16);
      pdf.text('概览摘要', margin, y);
      y += 10;

      pdf.setFontSize(11);
      const overview = data.overview;
      const summaryItems = [
        { label: 'MRR (月经常性收入)', value: fmtCurrency(overview.mrr) },
        { label: 'ARR (年经常性收入)', value: fmtCurrency(overview.arr) },
        { label: 'DAU (日活跃用户)', value: fmtNum(overview.dau) },
        { label: '付费用户', value: fmtNum(overview.payingUsers) },
        { label: '流失率', value: overview.churnRate.toFixed(1) + '%' },
      ];

      for (const item of summaryItems) {
        pdf.setTextColor(160, 160, 180);
        pdf.text(`${item.label}:`, margin, y);
        pdf.setTextColor(224, 224, 224);
        pdf.text(item.value, margin + 70, y);
        y += 7;

        if (y > pageHeight - 30) {
          pdf.addPage();
          y = 25;
        }
      }

      // ---- 关键变化 ----
      y += 5;
      pdf.setFontSize(16);
      pdf.setTextColor(224, 224, 224);
      pdf.text('关键变化（与上一周期对比）', margin, y);
      y += 10;

      pdf.setFontSize(11);
      const changeItems = [
        { label: 'MRR 变化', value: `${data.changes.mrrChange >= 0 ? '+' : ''}${data.changes.mrrChange.toFixed(1)}%` },
        { label: 'DAU 变化', value: `${data.changes.dauChange >= 0 ? '+' : ''}${data.changes.dauChange.toFixed(1)}%` },
        { label: '消息量变化', value: `${data.changes.messagesChange >= 0 ? '+' : ''}${data.changes.messagesChange.toFixed(1)}%` },
        { label: '付费用户变化', value: `${data.changes.payingUsersChange >= 0 ? '+' : ''}${data.changes.payingUsersChange.toFixed(1)}%` },
        { label: '流失率变化', value: `${data.changes.churnRateChange >= 0 ? '+' : ''}${data.changes.churnRateChange.toFixed(1)}pp` },
      ];

      for (const item of changeItems) {
        const isPositive = !item.value.startsWith('-') && item.value !== '0.0%' && item.value !== '0.0pp';
        pdf.setTextColor(160, 160, 180);
        pdf.text(`${item.label}:`, margin, y);
        pdf.setTextColor(isPositive ? 100 : 220, isPositive ? 220 : 100, isPositive ? 100 : 100);
        pdf.text(item.value, margin + 70, y);
        y += 7;

        if (y > pageHeight - 30) {
          pdf.addPage();
          y = 25;
        }
      }

      // ---- 完整数据模式：专家 + 方案分布 ----
      if (contentLevel === 'full') {
        y += 5;
        pdf.setTextColor(224, 224, 224);
        pdf.setFontSize(16);
        pdf.text('热门专家', margin, y);
        y += 10;

        pdf.setFontSize(11);
        for (const expert of data.topExperts) {
          pdf.setTextColor(160, 160, 180);
          pdf.text(expert.name, margin, y);
          pdf.setTextColor(224, 224, 224);
          pdf.text(`${expert.usageCount} 次`, margin + 70, y);
          y += 7;
        }

        y += 5;
        pdf.setFontSize(16);
        pdf.setTextColor(224, 224, 224);
        pdf.text('订阅方案分布', margin, y);
        y += 10;

        pdf.setFontSize(11);
        for (const plan of data.planDistribution) {
          pdf.setTextColor(160, 160, 180);
          pdf.text(`${plan.plan}:`, margin, y);
          pdf.setTextColor(224, 224, 224);
          pdf.text(`${plan.count} 用户 / MRR ${fmtCurrency(plan.mrr)}`, margin + 40, y);
          y += 7;
        }
      }

      setProgress(80);

      // ---- 图表截图（html2canvas） ----
      // 如果页面加载了图表组件且 ref 可用，尝试截图
      if (chartRef.current && contentLevel === 'full') {
        setStatusMsg('正在渲染图表...');
        // 小延迟等待 Recharts 渲染完成
        await new Promise((r) => setTimeout(r, 500));

        try {
          const canvas = await html2canvas(chartRef.current, {
            backgroundColor: '#1A1A2E',
            scale: 2,
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - margin * 2;
          const imgHeight = (canvas.height / canvas.width) * imgWidth;

          pdf.addPage();
          y = 25;
          pdf.setTextColor(224, 224, 224);
          pdf.setFontSize(16);
          pdf.text('趋势图表', margin, y);
          y += 10;
          pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
        } catch (canvasErr) {
          console.warn('[ReportGenerator] 图表截图失败（无图表元素）:', canvasErr);
          // 截图失败不阻塞 PDF 生成
        }
      }

      setProgress(90);

      // ---- 页脚 ----
      for (let i = 1; i <= pdf.getNumberOfPages(); i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 140);
        pdf.text(
          `QFriendly 数据报表 — 第 ${i} 页 / 共 ${pdf.getNumberOfPages()} 页`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' },
        );
      }

      setProgress(95);
      setStatusMsg('正在保存...');

      // 小延迟让 UI 更新
      await new Promise((r) => setTimeout(r, 300));

      // 3. 保存 PDF
      pdf.save(`QFriendly_Report_${new Date().toISOString().slice(0, 10)}.pdf`);

      setProgress(100);
      setStatusMsg('PDF 报表生成成功！');
      setTimeout(() => { setProgress(0); setStatusMsg(''); }, 2500);
    } catch (err) {
      const message = err instanceof Error ? err.message : '生成 PDF 失败';
      setError(message);
      setStatusMsg('');
      setProgress(0);
    } finally {
      setLoading(false);
    }
  }, [reportType, contentLevel, dateRange, fetchReportData]);

  // ====== 渲染 ======

  return (
    <div className="space-y-6" style={{ color: '#E0E0E0' }}>
      {/* ---- 配置区: 报表类型 + 内容级别 + 自定义日期 ---- */}
      <div
        className="rounded-xl p-6 space-y-5"
        style={{ backgroundColor: '#2D2D44' }}
      >
        <h2 className="text-lg font-semibold">报表配置</h2>

        {/* 报表类型 */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">报表类型</label>
          <div className="flex gap-2">
            {([
              { key: 'weekly' as ReportType, label: '周报' },
              { key: 'monthly' as ReportType, label: '月报' },
              { key: 'custom' as ReportType, label: '自定义' },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setReportType(opt.key)}
                className="px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200"
                style={{
                  backgroundColor: reportType === opt.key ? '#4A4A6A' : '#1E1E32',
                  color: reportType === opt.key ? '#E0E0E0' : '#888',
                  border: reportType === opt.key
                    ? '1px solid #6B6B9D'
                    : '1px solid transparent',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 自定义日期范围 */}
        {reportType === 'custom' && (
          <div>
            <label className="block text-sm text-gray-400 mb-2">日期范围</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: '#1E1E32',
                  color: '#E0E0E0',
                  border: '1px solid #4A4A6A',
                }}
              />
              <span className="text-gray-500">至</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: '#1E1E32',
                  color: '#E0E0E0',
                  border: '1px solid #4A4A6A',
                }}
              />
            </div>
          </div>
        )}

        {/* 内容级别 */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">报表内容</label>
          <div className="flex gap-2">
            {([
              { key: 'summary' as ContentLevel, label: '简洁摘要' },
              { key: 'full' as ContentLevel, label: '完整数据' },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setContentLevel(opt.key)}
                className="px-4 py-2 text-sm rounded-lg font-medium transition-all duration-200"
                style={{
                  backgroundColor: contentLevel === opt.key ? '#4A4A6A' : '#1E1E32',
                  color: contentLevel === opt.key ? '#E0E0E0' : '#888',
                  border: contentLevel === opt.key
                    ? '1px solid #6B6B9D'
                    : '1px solid transparent',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleExportCSV}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
            style={{
              backgroundColor: '#4A4A6A',
              color: '#E0E0E0',
            }}
          >
            导出 CSV
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
            style={{
              backgroundColor: '#5B5BA5',
              color: '#FFFFFF',
            }}
          >
            生成 PDF
          </button>
        </div>
      </div>

      {/* ---- 进度条和状态 ---- */}
      {(loading || statusMsg || error) && (
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ backgroundColor: '#2D2D44' }}
        >
          {/* 进度条 */}
          {progress > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{statusMsg || '处理中...'}</span>
                <span>{progress}%</span>
              </div>
              <div
                className="w-full h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: '#1E1E32' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: progress === 100 ? '#4CAF50' : '#5B5BA5',
                  }}
                />
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgba(220, 50, 50, 0.15)',
                color: '#F87171',
                border: '1px solid rgba(220, 50, 50, 0.3)',
              }}
            >
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-3 underline hover:no-underline"
              >
                关闭
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---- 数据预览 ---- */}
      {reportData && (
        <div
          className="rounded-xl p-6 space-y-5"
          style={{ backgroundColor: '#2D2D44' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">数据预览</h2>
            <span className="text-xs text-gray-500">
              {reportData.periodLabel}
            </span>
          </div>

          {/* 概览指标卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'MRR', value: fmtCurrency(reportData.overview.mrr) },
              { label: 'ARR', value: fmtCurrency(reportData.overview.arr) },
              { label: 'DAU', value: fmtNum(reportData.overview.dau) },
              { label: '付费用户', value: fmtNum(reportData.overview.payingUsers) },
              { label: '流失率', value: reportData.overview.churnRate.toFixed(1) + '%' },
            ].map((item) => (
              <div
                key={item.label}
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: '#1E1E32' }}
              >
                <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                <div className="text-lg font-bold">{item.value}</div>
              </div>
            ))}
          </div>

          {/* 关键变化 */}
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-3">关键变化</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'MRR', change: reportData.changes.mrrChange, unit: '%' },
                { label: 'DAU', change: reportData.changes.dauChange, unit: '%' },
                { label: '消息量', change: reportData.changes.messagesChange, unit: '%' },
                { label: '付费用户', change: reportData.changes.payingUsersChange, unit: '%' },
                { label: '流失率', change: reportData.changes.churnRateChange, unit: 'pp' },
              ].map((item) => {
                const isUp = item.change > 0;
                const isNeutral = item.change === 0;
                return (
                  <div
                    key={item.label}
                    className="p-3 rounded-lg text-center"
                    style={{ backgroundColor: '#1E1E32' }}
                  >
                    <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                    <div
                      className="text-sm font-bold"
                      style={{
                        color: isNeutral
                          ? '#888'
                          : isUp
                            ? '#4CAF50'
                            : '#F87171',
                      }}
                    >
                      {isUp ? '+' : ''}
                      {item.change.toFixed(1)}
                      {item.unit}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 完整数据: 图表 + 详情 */}
          {contentLevel === 'full' && (
            <>
              {/* 图表区域（供 html2canvas 截图） */}
              <div
                ref={chartRef}
                className="rounded-lg p-4 space-y-6"
                style={{ backgroundColor: '#1A1A2E' }}
              >
                <h3 className="text-sm font-medium text-gray-400">趋势图表</h3>

                {/* MRR 趋势图 */}
                {reportData.trends.mrr.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">MRR 趋势</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={reportData.trends.mrr}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3D3D5C" />
                        <XAxis dataKey="date" stroke="#888" fontSize={10} />
                        <YAxis stroke="#888" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#2D2D44',
                            border: '1px solid #4A4A6A',
                            borderRadius: '8px',
                            color: '#E0E0E0',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#5B5BA5"
                          strokeWidth={2}
                          dot={false}
                          name="MRR"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* DAU 趋势图 */}
                {reportData.trends.dau.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">DAU 趋势</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={reportData.trends.dau}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3D3D5C" />
                        <XAxis dataKey="date" stroke="#888" fontSize={10} />
                        <YAxis stroke="#888" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#2D2D44',
                            border: '1px solid #4A4A6A',
                            borderRadius: '8px',
                            color: '#E0E0E0',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#4CAF50"
                          strokeWidth={2}
                          dot={false}
                          name="DAU"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* 消息趋势图 */}
                {reportData.trends.messages.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">消息趋势</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={reportData.trends.messages}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3D3D5C" />
                        <XAxis dataKey="date" stroke="#888" fontSize={10} />
                        <YAxis stroke="#888" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#2D2D44',
                            border: '1px solid #4A4A6A',
                            borderRadius: '8px',
                            color: '#E0E0E0',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#FF9800"
                          strokeWidth={2}
                          dot={false}
                          name="Messages"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* 热门专家 */}
              {reportData.topExperts.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">热门专家</h3>
                  <div className="space-y-2">
                    {reportData.topExperts.map((expert, idx) => (
                      <div
                        key={expert.name}
                        className="flex items-center justify-between px-4 py-2 rounded-lg"
                        style={{ backgroundColor: '#1E1E32' }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">#{idx + 1}</span>
                          <span className="text-sm">{expert.name}</span>
                        </div>
                        <span className="text-sm text-gray-400">{expert.usageCount} 次</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

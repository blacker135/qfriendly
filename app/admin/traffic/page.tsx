'use client';
// app/admin/traffic/page.tsx
// 流量统计升级版 — PV/UV/首页曝光趋势 + 页面排行/设备分布/国家分布/来源分布
// 深色主题，使用 Recharts 图表库

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import DateRangePicker from '@/components/admin/shared/DateRangePicker';
import { getDefaultDateRange, type Preset } from '@/components/admin/shared/dateUtils';

/** 流量详情响应数据类型 */
interface TrafficDetail {
  pvTrend: { date: string; value: number }[];
  uvTrend: { date: string; value: number }[];
  homepageExposureTrend: { date: string; value: number }[];
  topPages: { path: string; count: number }[];
  deviceDistribution: { type: string; count: number }[];
  countryDistribution: { country: string; count: number }[];
  referrerDistribution: { source: string; count: number }[];
}

/** 图表深色主题配色 */
const COLORS = {
  pv: '#60A5FA',        // 蓝色
  uv: '#34D399',        // 绿色
  exposure: '#FBBF24',  // 黄色
  grid: '#374151',      // 网格线
  text: '#9CA3AF',      // 文字
  tooltip: '#1F2937',   // 提示框背景
};

/** 饼图/柱状图多色配色方案 */
const CHART_COLORS = [
  '#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA',
  '#FB923C', '#38BDF8', '#4ADE80', '#F472B6', '#94A3B8',
];

/** 设备类型中文映射 */
const DEVICE_LABELS: Record<string, string> = {
  desktop: '桌面端',
  mobile: '移动端',
  tablet: '平板',
  unknown: '未知',
};

/** 来源类型中文映射 */
const REFERRER_LABELS: Record<string, string> = {
  direct: '直接访问',
  Google: 'Google',
  Baidu: '百度',
  Bing: 'Bing',
  DuckDuckGo: 'DuckDuckGo',
  GitHub: 'GitHub',
  other: '其他',
};

/** 自定义 Tooltip 组件 — 深色主题（折线图用） */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

/** 饼图自定义 Tooltip */
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-sm font-medium" style={{ color: d.payload.color }}>
        {d.name}: {d.value.toLocaleString()}
      </p>
    </div>
  );
}

/** 柱状图 Tooltip — 页面排行 */
function PageBarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-gray-400 text-xs mb-1">页面: {d.payload.label}</p>
      <p className="text-sm font-medium text-blue-400">
        访问量: {d.value.toLocaleString()}
      </p>
    </div>
  );
}

/** 柱状图 Tooltip — 国家分布 */
function CountryBarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-gray-400 text-xs mb-1">国家: {d.payload.country}</p>
      <p className="text-sm font-medium text-purple-400">
        会话数: {d.value.toLocaleString()}
      </p>
    </div>
  );
}

export default function TrafficPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [data, setData] = useState<TrafficDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 获取流量详情数据
  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      start: dateRange.start,
      end: dateRange.end,
    });
    fetch(`/api/admin/traffic/detail?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error('获取流量详情失败:', err);
        setError('获取数据失败，请稍后重试');
        setLoading(false);
      });
  }, [dateRange]);

  // 计算累计指标
  const totals = useMemo(() => {
    if (!data) return { pv: 0, uv: 0, exposure: 0 };
    const pv = data.pvTrend.reduce((s, d) => s + d.value, 0);
    // UV 不应简单累加（会重复统计），取均值作为参考
    const uvAvg = data.uvTrend.length > 0
      ? Math.round(data.uvTrend.reduce((s, d) => s + d.value, 0) / data.uvTrend.length)
      : 0;
    const exposure = data.homepageExposureTrend.reduce((s, d) => s + d.value, 0);
    return { pv, uv: uvAvg, exposure };
  }, [data]);

  // 页面排行 Top 10 数据（取前10，反转用于横向柱状图显示）
  const topPagesData = useMemo(() => {
    if (!data?.topPages) return [];
    return [...data.topPages].slice(0, 10).map((p) => ({
      ...p,
      label: p.path.length > 25 ? p.path.slice(0, 25) + '...' : p.path,
    }));
  }, [data]);

  // 设备分布数据（含标签）
  const deviceData = useMemo(() => {
    if (!data?.deviceDistribution) return [];
    return data.deviceDistribution.map((d) => ({
      ...d,
      label: DEVICE_LABELS[d.type] || d.type,
    }));
  }, [data]);

  // 国家分布数据
  const countryData = useMemo(() => {
    if (!data?.countryDistribution) return [];
    return data.countryDistribution;
  }, [data]);

  // 来源分布数据
  const referrerData = useMemo(() => {
    if (!data?.referrerDistribution) return [];
    return data.referrerDistribution.map((r) => ({
      ...r,
      label: REFERRER_LABELS[r.source] || r.source,
    }));
  }, [data]);

  // 加载中状态
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">加载中...</div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400 text-lg">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* ---- 页面头部: 标题 + 日期选择 ---- */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-gray-200">流量统计</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* ---- KPI 指标卡片 ---- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="PV（页面访问量）"
          value={totals.pv}
          subtitle="累计页面浏览"
          color="blue"
        />
        <KpiCard
          title="UV（独立访客）"
          value={totals.uv}
          subtitle="日均独立访客（参考值）"
          color="green"
        />
        <KpiCard
          title="首页曝光"
          value={totals.exposure}
          subtitle="首页访问总量"
          color="yellow"
        />
      </div>

      {/* ---- PV/UV 趋势图 ---- */}
      <ChartCard title="PV / UV 趋势">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={(data.pvTrend || []).map((pvItem) => {
            const uvMatch = (data.uvTrend || []).find((uvItem) => uvItem.date === pvItem.date);
            return { date: pvItem.date.slice(5), PV: pvItem.value, UV: uvMatch?.value ?? 0 };
          })}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis dataKey="date" tick={{ fill: COLORS.text, fontSize: 12 }} />
            <YAxis tick={{ fill: COLORS.text, fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: COLORS.text }} />
            <Line
              type="monotone"
              dataKey="PV"
              stroke={COLORS.pv}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="UV"
              stroke={COLORS.uv}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ---- 首页曝光趋势图 ---- */}
      <ChartCard title="首页曝光趋势">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.homepageExposureTrend.map((d) => ({
            date: d.date.slice(5),
            曝光: d.value,
          }))}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
            <XAxis dataKey="date" tick={{ fill: COLORS.text, fontSize: 12 }} />
            <YAxis tick={{ fill: COLORS.text, fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="曝光"
              stroke={COLORS.exposure}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ---- 下部三列: 页面排行 + 设备分布 + 国家分布 ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 页面排行 Top 10 — 横向柱状图 */}
        <ChartCard title="页面排行 Top 10">
          {topPagesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topPagesData}
                layout="vertical"
                margin={{ left: 10, right: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                <XAxis type="number" tick={{ fill: COLORS.text, fontSize: 11 }} />
                <YAxis
                  dataKey="label"
                  type="category"
                  tick={{ fill: COLORS.text, fontSize: 11 }}
                  width={110}
                />
                <Tooltip content={<PageBarTooltip />} />
                <Bar dataKey="count" fill={COLORS.pv} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="暂无页面数据" />
          )}
        </ChartCard>

        {/* 设备分布 — 饼图 */}
        <ChartCard title="设备分布">
          {deviceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={45}
                  paddingAngle={2}
                >
                  {deviceData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  wrapperStyle={{ color: COLORS.text, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="暂无设备数据" />
          )}
        </ChartCard>

        {/* 国家分布 Top 10 — 横向柱状图 */}
        <ChartCard title="国家分布 Top 10">
          {countryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={countryData.slice(0, 10)}
                layout="vertical"
                margin={{ left: 10, right: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                <XAxis type="number" tick={{ fill: COLORS.text, fontSize: 11 }} />
                <YAxis
                  dataKey="country"
                  type="category"
                  tick={{ fill: COLORS.text, fontSize: 11 }}
                  width={60}
                />
                <Tooltip content={<CountryBarTooltip />} />
                <Bar dataKey="count" fill="#A78BFA" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="暂无国家数据" />
          )}
        </ChartCard>
      </div>

      {/* ---- 来源分布 — 饼图（全宽） ---- */}
      <ChartCard title="来源分布">
        {referrerData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={referrerData}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={55}
                paddingAngle={2}
              >
                {referrerData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                wrapperStyle={{ color: COLORS.text, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState text="暂无来源数据" />
        )}
      </ChartCard>
    </div>
  );
}

/**
 * KPI 指标卡片组件
 * 深色主题，显示标题、数值和副标题
 */
function KpiCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: number;
  subtitle: string;
  color: 'blue' | 'green' | 'yellow';
}) {
  const colorMap = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5`}>
      <div className="text-sm text-gray-400 mb-1">{title}</div>
      <div className={`text-3xl font-bold ${c.text}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
    </div>
  );
}

/**
 * 图表容器卡片组件
 * 深色主题，统一圆角边框和内边距
 */
function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-700 bg-[#2D2D44] p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">{title}</h3>
      {children}
    </div>
  );
}

/**
 * 空数据占位组件
 */
function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-[300px] text-gray-500 text-sm">
      {text}
    </div>
  );
}

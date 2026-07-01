'use client';
// components/admin/revenue/MRRWaterfall.tsx
// MRR 净增瀑布图 — 使用 Recharts BarChart 展示 MRR 各分项变化来源
// 包含: 期初 MRR / 新增 / 扩展 / 流失 / 降级 / 期末 MRR

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/** 瀑布图各分项数据 */
interface WaterfallProps {
  data: {
    startingMRR: number;
    newMRR: number;
    expansionMRR: number;
    churnedMRR: number;
    contractionMRR: number;
    endingMRR: number;
  };
}

/** 图表色板（深色主题） */
const COLORS = {
  starting: '#3B82F6',   // 蓝 — 期初
  new: '#22C55E',        // 绿 — 新增
  expansion: '#10B981',  // 翠绿 — 扩展
  churned: '#EF4444',    // 红 — 流失
  contraction: '#F59E0B', // 黄 — 降级
  ending: '#8B5CF6',     // 紫 — 期末
};

export default function MRRWaterfall({ data }: WaterfallProps) {
  // 构建图表数据，流失和降级使用负值表示 MRR 的减少
  const chartData = [
    { name: '期初 MRR', value: data.startingMRR, fill: COLORS.starting },
    { name: '新增', value: data.newMRR, fill: COLORS.new },
    { name: '扩展', value: data.expansionMRR, fill: COLORS.expansion },
    { name: '流失', value: -data.churnedMRR, fill: COLORS.churned },
    { name: '降级', value: -data.contractionMRR, fill: COLORS.contraction },
    { name: '期末 MRR', value: data.endingMRR, fill: COLORS.ending },
  ];

  return (
    <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">MRR 净增分析</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          {/* 网格线 — 深色主题 */}
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          {/* X 轴 — 显示各分项名称 */}
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
          />
          {/* Y 轴 — 显示金额 */}
          <YAxis
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            tickLine={false}
            axisLine={false}
          />
          {/* 提示框 — 深色风格 */}
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F9FAFB',
            }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, '']}
          />
          {/* 柱状图 — 每根柱子使用对应颜色 */}
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

'use client';
// components/admin/stats/RetentionChart.tsx
// 留存率柱状图 — 展示 D1/D7/D30 留存数据

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RetentionChartProps {
  d1Rate: number;
  d7Rate: number;
  d30Rate: number;
}

export default function RetentionChart({ d1Rate, d7Rate, d30Rate }: RetentionChartProps) {
  const data = [
    { name: 'D1', rate: d1Rate },
    { name: 'D7', rate: d7Rate },
    { name: 'D30', rate: d30Rate },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">用户留存率</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} unit="%" />
          <Tooltip />
          <Bar dataKey="rate" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

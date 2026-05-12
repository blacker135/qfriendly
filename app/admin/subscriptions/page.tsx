'use client';
// app/admin/subscriptions/page.tsx
// 订阅管理列表页 — 展示所有订阅记录，支持按状态筛选和分页

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import DataTable, { Column } from '@/components/admin/shared/DataTable';

interface SubRow {
  id: string;
  userName: string;
  userEmail: string;
  paypalSubscriptionId: string;
  variantName: string;
  status: string;
  currentPeriodEnd: string | null;
  createdAt: string;
}

const STATUSES = ['全部', 'active', 'cancelled', 'expired'];

const columns: Column<SubRow>[] = [
  { key: 'userName', header: '用户' },
  { key: 'userEmail', header: '邮箱' },
  {
    key: 'variantName',
    header: '等级',
    render: (row) => (
      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
        {row.variantName}
      </span>
    ),
  },
  {
    key: 'status',
    header: '状态',
    render: (row) => {
      const colors: Record<string, string> = {
        active: 'bg-green-50 text-green-700',
        cancelled: 'bg-yellow-50 text-yellow-700',
        expired: 'bg-red-50 text-red-700',
      };
      return (
        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${colors[row.status] ?? 'bg-gray-50 text-gray-500'}`}>
          {row.status}
        </span>
      );
    },
  },
  {
    key: 'currentPeriodEnd',
    header: '到期',
    render: (row) =>
      row.currentPeriodEnd ? new Date(row.currentPeriodEnd).toLocaleDateString('zh-CN') : '-',
  },
  {
    key: 'createdAt',
    header: '创建时间',
    render: (row) => new Date(row.createdAt).toLocaleDateString('zh-CN'),
  },
];

export default function SubscriptionsPage() {
  const router = useRouter();
  const [data, setData] = useState<{ subs: SubRow[]; total: number }>({ subs: [], total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status) params.set('status', status);
    const res = await fetch(`/api/admin/subscriptions?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [page, status]);

  useEffect(() => {
    fetchSubs();
  }, [fetchSubs]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">订阅管理</h1>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s === '全部' ? '' : s); setPage(1); }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              (s === '全部' && !status) || s === status
                ? 'bg-white text-gray-800 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {s === '全部' ? '全部' : s}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data.subs}
        total={data.total}
        page={page}
        pageSize={20}
        isLoading={loading}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/admin/subscriptions/${row.id}`)}
      />
    </div>
  );
}

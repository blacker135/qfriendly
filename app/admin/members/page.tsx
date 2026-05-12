'use client';
// app/admin/members/page.tsx
// 会员管理列表页 — 展示活跃订阅用户，支持按等级筛选、分页、导出

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import DataTable, { Column } from '@/components/admin/shared/DataTable';
import ExportButton from '@/components/admin/shared/ExportButton';

interface MemberRow {
  id: string;
  name: string;
  email: string;
  variantName: string | null;
  messageCount: number;
  createdAt: string;
}

const LEVELS = ['全部', 'starter', 'pro', 'ultra', 'admin'];

const columns: Column<MemberRow>[] = [
  { key: 'name', header: '姓名' },
  { key: 'email', header: '邮箱' },
  {
    key: 'variantName',
    header: '等级',
    render: (row) => (
      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">
        {row.variantName ?? '-'}
      </span>
    ),
  },
  { key: 'messageCount', header: '消息数' },
  {
    key: 'createdAt',
    header: '注册时间',
    render: (row) => new Date(row.createdAt).toLocaleDateString('zh-CN'),
  },
];

export default function MembersPage() {
  const router = useRouter();
  const [data, setData] = useState<{ members: MemberRow[]; total: number }>({ members: [], total: 0 });
  const [page, setPage] = useState(1);
  const [variant, setVariant] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (variant) params.set('variant', variant);
    const res = await fetch(`/api/admin/members?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [page, variant]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">会员管理</h1>
        <ExportButton apiUrl="/api/admin/members" body={{ variantName: variant || undefined }} label="导出会员" />
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        {LEVELS.map((lv) => (
          <button
            key={lv}
            onClick={() => { setVariant(lv === '全部' ? '' : lv); setPage(1); }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              (lv === '全部' && !variant) || lv === variant
                ? 'bg-white text-gray-800 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {lv === '全部' ? '全部' : lv.charAt(0).toUpperCase() + lv.slice(1)}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data.members}
        total={data.total}
        page={page}
        pageSize={20}
        isLoading={loading}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/admin/members/${row.id}`)}
      />
    </div>
  );
}

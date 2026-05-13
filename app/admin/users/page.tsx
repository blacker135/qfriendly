'use client';
// app/admin/users/page.tsx
// 统一用户管理列表页 — 展示所有用户，支持身份筛选、搜索和分页

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import UserTable, { UnifiedUserRow } from '@/components/admin/users/UserTable';

const VARIANTS = [
  { label: '全部', value: '' },
  { label: 'Free', value: 'free' },
  { label: 'Starter', value: 'starter' },
  { label: 'Pro', value: 'pro' },
  { label: 'Ultra', value: 'ultra' },
  { label: 'Admin', value: 'admin' },
];

export default function UsersPage() {
  const router = useRouter();
  const [data, setData] = useState<{ users: UnifiedUserRow[]; total: number }>({ users: [], total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [variant, setVariant] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    if (variant) params.set('variant', variant);
    const res = await fetch(`/api/admin/users?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [page, search, variant]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>

      {/* 身份筛选栏 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        {VARIANTS.map((v) => (
          <button
            key={v.value}
            onClick={() => { setVariant(v.value); setPage(1); }}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              variant === v.value
                ? 'bg-white text-gray-800 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <UserTable
        data={data.users}
        total={data.total}
        page={page}
        pageSize={20}
        isLoading={loading}
        onSearch={(s) => { setSearch(s); setPage(1); }}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
      />
    </div>
  );
}

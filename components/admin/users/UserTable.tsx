'use client';
// components/admin/users/UserTable.tsx
// 统一用户列表表格组件 — 展示用户名/邮箱/会员身份/到期时间/日限额/注册时间

import { useState } from 'react';
import DataTable, { Column } from '@/components/admin/shared/DataTable';

export interface UnifiedUserRow {
  id: string;
  name: string;
  email: string;
  variantName: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  dailyLimit: number | null;
  messageCount: number;
  createdAt: string;
}

const DEFAULT_DAILY_LIMITS: Record<string, number> = {
  starter: 30,
  pro: 100,
  ultra: 10000,
};

const VARIANT_COLORS: Record<string, string> = {
  free: 'bg-gray-50 text-gray-600',
  starter: 'bg-blue-50 text-blue-700',
  pro: 'bg-purple-50 text-purple-700',
  ultra: 'bg-amber-50 text-amber-700',
  admin: 'bg-red-50 text-red-700',
};

const columns: Column<UnifiedUserRow>[] = [
  { key: 'name', header: '用户名' },
  { key: 'email', header: '邮箱' },
  {
    key: 'variantName',
    header: '会员身份',
    render: (row) => {
      const variant = row.variantName && row.subscriptionStatus === 'active' ? row.variantName : 'free';
      return (
        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${VARIANT_COLORS[variant] || VARIANT_COLORS.free}`}>
          {variant}
        </span>
      );
    },
  },
  {
    key: 'currentPeriodEnd',
    header: '到期时间',
    render: (row) => {
      if (!row.currentPeriodEnd || row.subscriptionStatus !== 'active') return '-';
      return new Date(row.currentPeriodEnd).toLocaleDateString('zh-CN');
    },
  },
  {
    key: 'dailyLimit',
    header: '日限额',
    render: (row) => {
      if (row.dailyLimit !== null) return String(row.dailyLimit);
      const variant = row.variantName && row.subscriptionStatus === 'active' ? row.variantName : '';
      return variant ? String(DEFAULT_DAILY_LIMITS[variant] ?? '-') : '-';
    },
  },
  {
    key: 'createdAt',
    header: '注册时间',
    render: (row) => new Date(row.createdAt).toLocaleDateString('zh-CN'),
  },
];

interface UserTableProps {
  data: UnifiedUserRow[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onSearch: (s: string) => void;
  onPageChange: (p: number) => void;
  onRowClick: (row: UnifiedUserRow) => void;
}

export default function UserTable({ data, total, page, pageSize, isLoading, onSearch, onPageChange, onRowClick }: UserTableProps) {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchSubmit = () => {
    onSearch(searchInput);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
          placeholder="搜索用户名或邮箱..."
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={handleSearchSubmit}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          搜索
        </button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        total={total}
        page={page}
        pageSize={pageSize}
        isLoading={isLoading}
        onPageChange={onPageChange}
        onRowClick={onRowClick}
      />
    </div>
  );
}

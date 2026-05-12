'use client';
// app/admin/members/[id]/page.tsx
// 会员详情页 — 查看会员信息、订阅详情，支持变更会员等级

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const LEVELS = ['starter', 'pro', 'ultra', 'admin'];

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newLevel, setNewLevel] = useState('');

  useEffect(() => {
    fetch(`/api/admin/members/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setNewLevel(d.subscription?.variantName ?? 'starter');
        setLoading(false);
      });
  }, [id]);

  const handleUpgrade = async () => {
    await fetch(`/api/admin/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantName: newLevel }),
    });
    setData((prev: any) => ({
      ...prev,
      subscription: { ...prev.subscription, variantName: newLevel },
    }));
  };

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!data) return <div className="p-6 text-gray-400">会员不存在</div>;

  const { user, subscription } = data;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">
          ← 返回
        </button>
        <h1 className="text-2xl font-bold text-gray-800">会员详情</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">{user.name}</h2>
        <p className="text-sm text-gray-500">{user.email}</p>

        {subscription && (
          <div className="pt-4 border-t space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">当前等级</span>
                <p className="mt-1 font-semibold text-blue-600">{subscription.variantName}</p>
              </div>
              <div>
                <span className="text-gray-400">状态</span>
                <p className="mt-1">{subscription.status}</p>
              </div>
              <div>
                <span className="text-gray-400">到期</span>
                <p className="mt-1">
                  {subscription.currentPeriodEnd
                    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('zh-CN')
                    : '-'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold mb-3">变更等级</h3>
              <div className="flex items-center gap-3">
                <select
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <button
                  onClick={handleUpgrade}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  确认变更
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

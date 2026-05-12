'use client';
// app/admin/subscriptions/[id]/page.tsx
// 订阅详情页 — 查看订阅详情、变更日志，支持取消/到期操作

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/admin/shared/ConfirmDialog';

export default function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [sub, setSub] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancel, setShowCancel] = useState(false);
  const [showExpire, setShowExpire] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/subscriptions/${id}`).then((r) => r.json()),
      fetch(`/api/admin/subscriptions/${id}/history`).then((r) => r.json()),
    ]).then(([subData, histData]) => {
      setSub(subData);
      setHistory(histData);
      setLoading(false);
    });
  }, [id]);

  const handleStatusChange = async (status: string) => {
    await fetch(`/api/admin/subscriptions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSub((prev: any) => ({ ...prev, status }));
    setShowCancel(false);
    setShowExpire(false);
  };

  if (loading) return <div className="p-6 text-gray-400">加载中...</div>;
  if (!sub) return <div className="p-6 text-gray-400">订阅不存在</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">
          ← 返回
        </button>
        <h1 className="text-2xl font-bold text-gray-800">订阅详情</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">基本信息</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-400">PayPal 订阅 ID</span><p className="mt-1 font-mono text-xs">{sub.paypalSubscriptionId}</p></div>
          <div><span className="text-gray-400">计划 ID</span><p className="mt-1">{sub.paypalPlanId}</p></div>
          <div><span className="text-gray-400">等级</span><p className="mt-1 font-semibold">{sub.variantName}</p></div>
          <div><span className="text-gray-400">状态</span><p className="mt-1">{sub.status}</p></div>
          <div><span className="text-gray-400">周期开始</span><p className="mt-1">{sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString('zh-CN') : '-'}</p></div>
          <div><span className="text-gray-400">周期结束</span><p className="mt-1">{sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('zh-CN') : '-'}</p></div>
        </div>

        {sub.status === 'active' && (
          <div className="pt-4 border-t flex gap-3">
            <button onClick={() => setShowCancel(true)} className="px-4 py-2 text-sm text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-50">
              取消订阅
            </button>
            <button onClick={() => setShowExpire(true)} className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
              标记到期
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">变更日志</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">暂无变更记录</p>
        ) : (
          <div className="space-y-2">
            {history.map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                <div>
                  <span className="text-gray-600">
                    {e.payload?.variantName} → {e.payload?.status}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(e.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog open={showCancel} title="取消订阅" message="确认取消此订阅？" confirmLabel="取消订阅" onConfirm={() => handleStatusChange('cancelled')} onCancel={() => setShowCancel(false)} />
      <ConfirmDialog open={showExpire} title="标记到期" message="确认将此订阅标记为到期？" confirmLabel="标记到期" onConfirm={() => handleStatusChange('expired')} onCancel={() => setShowExpire(false)} />
    </div>
  );
}

// app/admin/settings/page.tsx
// 统计设置页面 — 服务端鉴权，客户端渲染配置表单

import { getAdminUserId } from '@/lib/admin/guard';
import { redirect } from 'next/navigation';
import SettingsForm from '@/components/admin/settings/SettingsForm';

/**
 * 统计设置页面（Server Component）
 * - 服务端校验管理员权限
 * - 渲染 SettingsForm 客户端组件
 */
export default async function SettingsPage() {
  const auth = await getAdminUserId();
  if (typeof auth !== 'string') {
    redirect('/');
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-200">统计设置</h1>
      <p className="text-sm text-gray-400">
        配置数据采集、活跃度分层、流失判断和数据保留等统计参数。
      </p>
      <SettingsForm />
    </div>
  );
}

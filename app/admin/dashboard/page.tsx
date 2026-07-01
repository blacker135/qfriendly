// app/admin/dashboard/page.tsx
// 综合仪表盘页面 — 服务端鉴权，客户端获取数据并渲染

import { getAdminUserId } from '@/lib/admin/guard';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

/**
 * 仪表盘页面（Server Component）
 * - 服务端校验管理员权限
 * - 渲染 DashboardClient（客户端组件，自行从 API 获取数据）
 */
export default async function DashboardPage() {
  const auth = await getAdminUserId();
  // getAdminUserId 返回 userId 字符串或 NextResponse
  // 如果返回 NextResponse，说明不是 admin，跳转到首页
  if (typeof auth !== 'string') {
    redirect('/');
  }

  // 数据获取完全交给客户端组件（/api/admin/dashboard/overview）
  return <DashboardClient />;
}

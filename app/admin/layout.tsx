// app/admin/layout.tsx
// 管理后台根布局 — 服务端权限校验 + 编辑器字体加载

import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin/guard';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import AdminLayout from '@/components/admin/AdminLayout';

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  if (!userId) {
    redirect('/auth/login');
  }

  const admin = await isAdmin(userId);
  if (!admin) {
    redirect('/');
  }

  return (
    <>
      {/* Fira Code 等宽字体 — 用于智能体提示词编辑器 */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <AdminLayout>{children}</AdminLayout>
    </>
  );
}

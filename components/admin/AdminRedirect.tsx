'use client';
// components/admin/AdminRedirect.tsx
// 登录后检测是否为管理员，是则自动跳转到 /admin 管理后台（仅一次）

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const REDIRECT_KEY = 'admin_redirected';

export default function AdminRedirect({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin) return;
    // 检查 sessionStorage 标记，已跳转过则不再跳转
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(REDIRECT_KEY) === '1') {
      return;
    }
    window.sessionStorage.setItem(REDIRECT_KEY, '1');
    router.replace('/admin');
  }, [isAdmin, router]);

  return null;
}

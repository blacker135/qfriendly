// ============================================================
// /[lang]/chat/layout.tsx — 聊天路由 Auth 守卫布局
// ============================================================
// 功能：
//   - 服务端校验 Better Auth session
//   - 未登录用户重定向到 /[lang]/auth/login
//   - 已登录用户渲染子组件（聊天页）
// ============================================================

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import HeartbeatPulse from '@/components/chat/HeartbeatPulse';

/**
 * 聊天布局 — Auth 守卫 + 心跳脉冲
 * 所有 /[lang]/chat/* 路由都会经过此布局：
 *   1. 身份验证（未登录跳转登录页）
 *   2. 嵌入心跳脉冲组件，跟踪用户会话活跃度
 */
export default async function ChatLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  // 未登录 → 重定向到登录页
  if (!session?.user) {
    const { lang } = await params;
    redirect(`/${lang}/auth/login`);
  }

  // 已登录 → 渲染子页面 + 心跳组件
  return (
    <>
      <HeartbeatPulse />
      {children}
    </>
  );
}

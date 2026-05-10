// ============================================================
// /[lang]/chat/page.tsx — 聊天入口页重定向
// ============================================================
// 访问 /chat 时自动重定向到 /chat/liam（默认专家）
// ============================================================

import { redirect } from 'next/navigation';

/**
 * 聊天入口页 — 服务端重定向到默认专家 Liam
 */
export default async function ChatPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  redirect(`/${lang}/chat/liam`);
}

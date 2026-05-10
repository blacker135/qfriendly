// ============================================================
// lib/supabase/client.ts — 浏览器端 Supabase 客户端
// ============================================================
// 使用 @supabase/ssr 的 createBrowserClient
// 用于客户端组件（'use client'）中的 Supabase 调用
// ============================================================

import { createBrowserClient } from '@supabase/ssr';

/**
 * 创建浏览器端 Supabase 客户端实例
 * 在客户端组件中调用，用于数据库查询、Auth 等操作
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

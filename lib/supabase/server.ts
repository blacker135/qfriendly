// ============================================================
// lib/supabase/server.ts — 服务端 Supabase 客户端
// ============================================================
// 使用 @supabase/ssr 的 createServerClient + cookies
// 用于服务端组件、API 路由（Route Handlers）、Server Actions
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * 创建服务端 Supabase 客户端实例
 * 自动从 cookies 中读取/写入 session 信息
 *
 * 使用示例（服务端组件）：
 *   const supabase = await createServerSupabase();
 *   const { data: { user } } = await supabase.auth.getUser();
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

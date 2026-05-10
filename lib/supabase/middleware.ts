// ============================================================
// lib/supabase/middleware.ts — Supabase 中间件辅助函数
// ============================================================
// 用于 Next.js middleware.ts 中刷新 session
// 确保每次请求时用户的认证状态保持最新
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * 在 middleware 中刷新 Supabase session
 *
 * 使用示例（middleware.ts）：
 *   import { updateSession } from '@/lib/supabase/middleware';
 *   export async function middleware(request: NextRequest) {
 *     return await updateSession(request);
 *   }
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 先更新请求的 cookies（供后续读取）
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // 用新的 response 替换，以便设置 cookies
          supabaseResponse = NextResponse.next({ request });
          // 将 cookies 写入 response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 调用 getUser 触发 session 刷新（如有必要）
  await supabase.auth.getUser();

  return supabaseResponse;
}

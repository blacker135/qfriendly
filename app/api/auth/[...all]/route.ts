// app/api/auth/[...all]/route.ts
// Better Auth API 路由处理器 — 处理所有 Auth 请求
// (sign-in/email, sign-up/email, session, sign-out 等)

import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);

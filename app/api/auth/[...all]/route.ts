// app/api/auth/[...all]/route.ts
// Better Auth API 路由处理器 — 处理所有 Auth 请求
// (sign-in/email, sign-up/email, session, sign-out 等)
// regions: hkg1 (香港) — 优化数据库连接延迟（广州↔香港 ~20ms）

import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

// Vercel 函数部署区域：香港，减少与腾讯云广州数据库的延迟
export const regions = ['hkg1'];

export const { GET, POST } = toNextJsHandler(auth);

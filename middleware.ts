// middleware.ts
// 根级中间件 — 仅处理 next-intl 国际化路由
// Auth session 管理由 Better Auth 自动处理（cookie-based）

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export function middleware(request: Request) {
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

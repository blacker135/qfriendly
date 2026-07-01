// ============================================================
// components/common/Providers.tsx — 客户端 Provider 包装器
// ============================================================
// 将需要客户端环境的功能组件（如 ErrorBoundary）
// 包装为可在服务端布局中使用的客户端组件。
// ============================================================

'use client';

import { ReactNode, useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers — 客户端包装器
 * - 用 ErrorBoundary 包裹所有子组件以捕获渲染错误
 * - 初始化匿名访客标识（qf_anonymous_id），用于游客→注册转化追踪
 */
export function Providers({ children }: ProvidersProps) {
  // 生成匿名访客标识（首次访问时设置，有效期 90 天）
  useEffect(() => {
    const ANON_KEY = 'qf_anonymous_id';
    if (!document.cookie.includes(`${ANON_KEY}=`)) {
      const id = crypto.randomUUID();
      document.cookie = `${ANON_KEY}=${id}; path=/; max-age=${90 * 86400}; SameSite=Lax`;
    }
  }, []);

  return <ErrorBoundary>{children}</ErrorBoundary>;
}

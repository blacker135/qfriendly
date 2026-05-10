// ============================================================
// /[lang]/auth/login — 登录/注册页面路由
// ============================================================
// 渲染 AuthForm 组件，支持登录与注册模式切换
// ============================================================

import { AuthForm } from '@/components/auth/AuthForm';

/**
 * 登录页面 — 服务端组件包装客户端 AuthForm
 */
export default function LoginPage() {
  return <AuthForm />;
}

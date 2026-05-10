/**
 * 根路由页面
 * 根据请求的 Accept-Language 请求头自动重定向到对应语言路由
 * 中文用户 -> /zh，其他 -> /en（默认英文）
 */

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { routing } from '@/i18n/routing';

export default async function RootPage() {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language') || '';

  // 检测浏览器语言偏好：中文开头则跳转中文，否则默认英文
  const detected = acceptLanguage.startsWith('zh') ? 'zh' : routing.defaultLocale;

  redirect(`/${detected}`);
}

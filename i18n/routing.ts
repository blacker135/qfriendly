/**
 * next-intl 国际化路由配置
 * 定义支持的语言、默认语言和前缀策略
 */

import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // 支持的语言列表
  locales: ['en', 'zh'],

  // 默认语言（英文）
  defaultLocale: 'en',

  // 始终在 URL 中显示语言前缀，如 /en 和 /zh
  localePrefix: 'always',

  // 启用自动语言检测（基于 Accept-Language 请求头）
  localeDetection: true,
});

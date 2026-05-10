/**
 * next-intl 请求级配置
 * 根据请求上下文动态加载对应语言的翻译消息
 */

import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

// 支持的语言类型
type SupportedLocale = 'en' | 'zh';

export default getRequestConfig(async ({ requestLocale }) => {
  // 获取请求中的语言设置
  let locale = await requestLocale;

  // 如果语言不支持或未检测到，回退到默认语言
  if (!locale || !routing.locales.includes(locale as SupportedLocale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    // 动态导入对应语言的翻译文件
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});

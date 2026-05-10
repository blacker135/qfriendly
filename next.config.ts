/**
 * Next.js 配置文件
 * 集成 next-intl 国际化插件
 */

import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// 创建 next-intl 插件，指向请求配置文件
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {};

// 使用 next-intl 插件包裹配置
export default withNextIntl(nextConfig);

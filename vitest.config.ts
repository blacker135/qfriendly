// ============================================================
// vitest.config.ts — Vitest 测试运行器配置
// ============================================================
// 配置测试环境为 Node.js，并设置 @ 路径别名
// 用于运行 __tests__/ 目录下的单元测试
// ============================================================

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});

// DeepSeek API 客户端模块
// 使用 OpenAI SDK 兼容模式连接 DeepSeek API

import OpenAI from 'openai';

/**
 * DeepSeek API 客户端工厂函数
 * 由于 DeepSeek API 与 OpenAI SDK 完全兼容，只需修改 baseURL 即可
 *
 * 环境变量要求：
 * - DEEPSEEK_API_KEY: DeepSeek API 密钥（必需）
 * - DEEPSEEK_BASE_URL: 自定义 API 地址（可选，默认官方地址）
 */
export function createDeepSeekClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  });
}

// lib/prompts/cache.ts
// 专家提示词内存缓存
// Vercel Fluid Compute 函数实例复用期间持续有效
// 冷启动时自动从 DB 回填

import type { ExpertId, Language } from './experts';

/** 缓存条目 */
interface CacheEntry {
  content: string;
  cachedAt: number;
}

/** 模块级内存缓存 */
const cache = new Map<string, CacheEntry>();

/**
 * 生成缓存 key
 * 格式: "${expert}:${lang}:${type}"
 */
function cacheKey(expert: ExpertId, language: Language, type: string): string {
  return `${expert}:${language}:${type}`;
}

/**
 * 从缓存读取提示词
 * @returns 缓存内容，未命中返回 null
 */
export function getCachedPrompt(
  expert: ExpertId,
  language: Language,
  type: string,
): string | null {
  const entry = cache.get(cacheKey(expert, language, type));
  if (!entry) return null;
  return entry.content;
}

/**
 * 写入缓存
 */
export function setCachedPrompt(
  expert: ExpertId,
  language: Language,
  type: string,
  content: string,
): void {
  cache.set(cacheKey(expert, language, type), {
    content,
    cachedAt: Date.now(),
  });
}

/**
 * 清除单条缓存（PUT API 保存后调用）
 */
export function invalidateCache(
  expert: ExpertId,
  language: Language,
  type: string,
): void {
  cache.delete(cacheKey(expert, language, type));
}

/**
 * 清除全部缓存（调试/测试用）
 */
export function clearAllCache(): void {
  cache.clear();
}

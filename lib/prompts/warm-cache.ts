// lib/prompts/warm-cache.ts
// 服务端专用模块 — 从 DB 加载专家提示词到内存缓存
// 由 chat API route 在请求处理前调用
// 此文件 import pg，禁止在客户端组件中使用

import { getPromptFromDB } from './store';
import { setCachedPrompt } from './cache';
import type { ExpertId, Language } from './experts';

/** 需要预热的类型列表（与 expert_prompts 表一致） */
const PROMPT_TYPES = ['system', 'welcome', 'switch'] as const;

/**
 * 预热指定专家和语言的缓存
 * 从 DB 加载一条提示词到内存缓存，失败时静默（缓存未命中回退硬编码默认值）
 */
async function warmPrompt(
  expert: ExpertId,
  language: Language,
  type: string,
): Promise<void> {
  try {
    const content = await getPromptFromDB(expert, language, type);
    if (content !== null) {
      setCachedPrompt(expert, language, type, content);
    }
  } catch (err) {
    // 静默失败：缓存未命中会回退硬编码默认值
    console.error(`prompt cache warm failed (${expert}:${language}:${type}):`, err);
  }
}

/**
 * 预热单个专家所有类型的缓存（3 types × 1 language = 3 条）
 * 在 chat API 处理请求前调用
 */
export async function warmExpertCache(
  expert: ExpertId,
  language: Language,
): Promise<void> {
  await Promise.all(
    PROMPT_TYPES.map((type) => warmPrompt(expert, language, type)),
  );
}

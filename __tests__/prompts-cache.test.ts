// __tests__/prompts-cache.test.ts
// 专家提示词缓存模块单元测试

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCachedPrompt,
  setCachedPrompt,
  invalidateCache,
  clearAllCache,
} from '@/lib/prompts/cache';

beforeEach(() => {
  clearAllCache();
});

describe('prompts cache', () => {
  it('getCachedPrompt returns null on cache miss', () => {
    expect(getCachedPrompt('evan', 'en', 'system')).toBeNull();
  });

  it('setCachedPrompt + getCachedPrompt round-trips', () => {
    setCachedPrompt('liam', 'zh', 'welcome', '你好，我是 Liam');
    expect(getCachedPrompt('liam', 'zh', 'welcome')).toBe('你好，我是 Liam');
  });

  it('invalidateCache removes a specific entry', () => {
    setCachedPrompt('noah', 'en', 'system', 'test');
    invalidateCache('noah', 'en', 'system');
    expect(getCachedPrompt('noah', 'en', 'system')).toBeNull();
  });

  it('invalidateCache does not affect other entries', () => {
    setCachedPrompt('evan', 'en', 'system', 'evan-system');
    setCachedPrompt('liam', 'en', 'system', 'liam-system');
    invalidateCache('evan', 'en', 'system');
    expect(getCachedPrompt('evan', 'en', 'system')).toBeNull();
    expect(getCachedPrompt('liam', 'en', 'system')).toBe('liam-system');
  });

  it('clearAllCache removes everything', () => {
    setCachedPrompt('evan', 'en', 'system', 'a');
    setCachedPrompt('adrian', 'zh', 'welcome', 'b');
    clearAllCache();
    expect(getCachedPrompt('evan', 'en', 'system')).toBeNull();
    expect(getCachedPrompt('adrian', 'zh', 'welcome')).toBeNull();
  });

  it('cache key is different for different types', () => {
    setCachedPrompt('evan', 'en', 'system', 'sys');
    setCachedPrompt('evan', 'en', 'welcome', 'wel');
    expect(getCachedPrompt('evan', 'en', 'system')).toBe('sys');
    expect(getCachedPrompt('evan', 'en', 'welcome')).toBe('wel');
  });
});

// __tests__/prompts-store.test.ts
// 专家提示词存储模块单元测试
// 测试 DB CRUD 操作逻辑（不依赖实际 DB 连接，仅验证函数签名和类型）

import { describe, it, expect } from 'vitest';
import { getPromptFromDB, upsertPrompt, getAllPromptsFromDB } from '@/lib/prompts/store';

describe('prompts store', () => {
  it('getPromptFromDB is a function with correct signature', () => {
    expect(typeof getPromptFromDB).toBe('function');
    expect(getPromptFromDB.length).toBe(3); // expert, language, type
  });

  it('upsertPrompt is a function with correct signature', () => {
    expect(typeof upsertPrompt).toBe('function');
    expect(upsertPrompt.length).toBe(4); // expert, language, type, content
  });

  it('getAllPromptsFromDB is a function with correct signature', () => {
    expect(typeof getAllPromptsFromDB).toBe('function');
    expect(getAllPromptsFromDB.length).toBe(1); // filters?
  });
});

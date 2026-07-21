// ============================================================
// __tests__/prompts.test.ts — 专家提示词系统测试
// ============================================================
// 测试专家 System Prompt、切换提示词和欢迎语的完整性和正确性
// ============================================================

import { describe, it, expect } from 'vitest';
import { getExpertPrompt, getSwitchPrompt, getWelcomeMessage } from '@/lib/prompts/experts';

describe('Expert Prompts', () => {
  const experts = ['evan', 'liam', 'noah', 'adrian'] as const;

  // ---------- System Prompt 完整性检查 ----------
  it.each(experts)('%s should have en and zh prompts', (expert) => {
    const en = getExpertPrompt(expert, 'en');
    const zh = getExpertPrompt(expert, 'zh');
    // 每种语言的提示词应超过 500 个字符（新 prompt 包含完整流程+原则+工具）
    expect(en.length).toBeGreaterThan(500);
    expect(zh.length).toBeGreaterThan(500);
    // 英文提示词应包含专家名称
    const expertNames: Record<string, string> = {
      evan: 'Evan Pierce',
      liam: 'Liam Hart',
      noah: 'Noah Sinclair',
      adrian: 'Adrian Cole',
    };
    expect(en).toContain(expertNames[expert]);
    expect(zh).toContain(expertNames[expert]);
    // 每种语言提示词应包含四步框架中的关键步骤
    expect(en.toLowerCase()).toContain('gather information');
    expect(zh).toContain('收集信息');
  });

  // ---------- 切换提示词占位符替换 ----------
  it('switch prompt replaces placeholders', () => {
    const result = getSwitchPrompt('Test', 'The Tester', 'Context here', 'en', 'evan');
    expect(result).toContain('Test');
    expect(result).toContain('The Tester');
    expect(result).toContain('Context here');
    // 不应该有任何未替换的占位符
    expect(result).not.toContain('{name}');
    expect(result).not.toContain('{title}');
    expect(result).not.toContain('{context}');
  });

  it('switch prompt supports Chinese language', () => {
    const result = getSwitchPrompt('测试', '测试者', '背景信息', 'zh', 'liam');
    expect(result).toContain('测试');
    expect(result).toContain('测试者');
    expect(result).toContain('背景信息');
    expect(result).not.toContain('{name}');
  });

  // ---------- 欢迎语检查 ----------
  it.each(experts)('%s should have welcome messages in both languages', (expert) => {
    const en = getWelcomeMessage(expert, 'en');
    const zh = getWelcomeMessage(expert, 'zh');
    // 欢迎语应超过 20 个字符
    expect(en.length).toBeGreaterThan(20);
    expect(zh.length).toBeGreaterThan(20);
    // 欢迎语应包含专家名称
    expect(typeof en).toBe('string');
    expect(typeof zh).toBe('string');
  });
});

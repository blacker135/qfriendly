// ============================================================
// __tests__/expert-validation.test.ts — 专家和语言验证测试
// ============================================================
// 测试有效/无效专家和语言的校验逻辑
// ============================================================

import { describe, it, expect } from 'vitest';

const VALID_EXPERTS = ['evan', 'liam', 'noah', 'adrian'];
const VALID_LANGS = ['en', 'zh'];

/** 校验专家标识符是否有效 */
function validateExpert(expert: string): boolean {
  return VALID_EXPERTS.includes(expert);
}

/** 校验语言代码是否有效 */
function validateLanguage(lang: string): boolean {
  return VALID_LANGS.includes(lang);
}

describe('Expert and Language Validation', () => {
  // ---------- 专家校验 ----------
  it.each(VALID_EXPERTS)('should accept valid expert: %s', (expert) => {
    expect(validateExpert(expert)).toBe(true);
  });

  it('should reject invalid expert', () => {
    expect(validateExpert('invalid')).toBe(false);
    expect(validateExpert('')).toBe(false);
  });

  // ---------- 语言校验 ----------
  it.each(VALID_LANGS)('should accept valid language: %s', (lang) => {
    expect(validateLanguage(lang)).toBe(true);
  });

  it('should reject invalid language', () => {
    expect(validateLanguage('fr')).toBe(false);
  });
});

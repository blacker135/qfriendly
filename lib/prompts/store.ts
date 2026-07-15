// lib/prompts/store.ts
// 专家提示词数据库读写操作
// 封装 expert_prompts 表的 CRUD，供 cache 层和 API 使用

import { db, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import type { ExpertId, Language } from './experts';

/** 提示词数据库记录 */
export interface PromptRecord {
  id: string;
  expert: ExpertId;
  language: Language;
  promptType: string;
  content: string;
  updatedAt: Date;
}

/**
 * 从数据库读取单条提示词
 * @returns 提示词内容，无记录返回 null
 */
export async function getPromptFromDB(
  expert: ExpertId,
  language: Language,
  type: string,
): Promise<string | null> {
  const rows = await db
    .select()
    .from(schema.expertPrompts)
    .where(
      and(
        eq(schema.expertPrompts.expert, expert),
        eq(schema.expertPrompts.language, language),
        eq(schema.expertPrompts.promptType, type),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;
  return rows[0].content;
}

/**
 * Upsert 单条提示词（PUT API 用）
 * 利用 DB UNIQUE 约束做 INSERT ON CONFLICT UPDATE
 */
export async function upsertPrompt(
  expert: ExpertId,
  language: Language,
  type: string,
  content: string,
): Promise<void> {
  await db
    .insert(schema.expertPrompts)
    .values({ expert, language, promptType: type, content, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [
        schema.expertPrompts.expert,
        schema.expertPrompts.language,
        schema.expertPrompts.promptType,
      ],
      set: { content, updatedAt: new Date() },
    });
}

/**
 * 获取所有提示词（GET API 用）
 * 支持可选过滤
 */
export async function getAllPromptsFromDB(filters?: {
  expert?: ExpertId;
  language?: Language;
}): Promise<PromptRecord[]> {
  const conditions = [];
  if (filters?.expert) conditions.push(eq(schema.expertPrompts.expert, filters.expert));
  if (filters?.language) conditions.push(eq(schema.expertPrompts.language, filters.language));

  const rows = await db
    .select()
    .from(schema.expertPrompts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(
      schema.expertPrompts.expert,
      schema.expertPrompts.language,
      schema.expertPrompts.promptType,
    );

  return rows.map((row) => ({
    id: row.id,
    expert: row.expert as ExpertId,
    language: row.language as Language,
    promptType: row.promptType,
    content: row.content,
    updatedAt: row.updatedAt,
  }));
}

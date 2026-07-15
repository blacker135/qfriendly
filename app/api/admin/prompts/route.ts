// app/api/admin/prompts/route.ts
// GET /api/admin/prompts — 获取所有提示词（支持筛选）
// PUT /api/admin/prompts — 批量保存提示词（UPSERT + 清除缓存）

import { getAdminUserId } from '@/lib/admin/guard';
import { getAllPromptsFromDB, upsertPrompt, type PromptRecord } from '@/lib/prompts/store';
import { invalidateCache } from '@/lib/prompts/cache';
import { NextRequest, NextResponse } from 'next/server';

// Vercel 部署在香港区域
export const regions = ['hkg1'];

/** 合法值集合 */
const VALID_EXPERTS = new Set(['evan', 'liam', 'noah', 'adrian']);
const VALID_LANGUAGES = new Set(['en', 'zh']);
const VALID_TYPES = new Set(['system', 'welcome', 'switch']);

/**
 * GET /api/admin/prompts
 * 返回所有提示词记录
 * 可选参数: ?expert=evan&language=zh
 */
export async function GET(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const expert = searchParams.get('expert') || undefined;
    const language = searchParams.get('language') || undefined;

    // 校验可选筛选参数
    if (expert && !VALID_EXPERTS.has(expert)) {
      return NextResponse.json({ error: '无效的 expert 参数' }, { status: 400 });
    }
    if (language && !VALID_LANGUAGES.has(language)) {
      return NextResponse.json({ error: '无效的 language 参数' }, { status: 400 });
    }

    const prompts = await getAllPromptsFromDB({
      expert: expert as PromptRecord['expert'] | undefined,
      language: language as PromptRecord['language'] | undefined,
    });

    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('[AdminPrompts] 获取提示词失败:', error);
    return NextResponse.json({ error: '获取提示词失败' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/prompts
 * 批量保存提示词
 * 请求体: { prompts: [{ expert, language, promptType, content }] }
 * 保存成功后清除对应缓存
 */
export async function PUT(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  try {
    const body: { prompts: Array<{ expert: string; language: string; promptType: string; content: string }> } = await req.json();

    // 校验 body 结构
    if (!body || !Array.isArray(body.prompts) || body.prompts.length === 0) {
      return NextResponse.json(
        { error: '请求体必须包含非空 prompts 数组' },
        { status: 400 },
      );
    }

    // 逐条校验 + 保存
    for (const item of body.prompts) {
      if (!VALID_EXPERTS.has(item.expert)) {
        return NextResponse.json(
          { error: `无效的 expert: "${item.expert}"` },
          { status: 400 },
        );
      }
      if (!VALID_LANGUAGES.has(item.language)) {
        return NextResponse.json(
          { error: `无效的 language: "${item.language}"` },
          { status: 400 },
        );
      }
      if (!VALID_TYPES.has(item.promptType)) {
        return NextResponse.json(
          { error: `无效的 promptType: "${item.promptType}"` },
          { status: 400 },
        );
      }
      if (!item.content || typeof item.content !== 'string' || item.content.trim().length === 0) {
        return NextResponse.json(
          { error: `content 不能为空 (${item.expert}/${item.language}/${item.promptType})` },
          { status: 400 },
        );
      }
    }

    // 逐条保存 + 清除缓存
    for (const item of body.prompts) {
      await upsertPrompt(
        item.expert as PromptRecord['expert'],
        item.language as PromptRecord['language'],
        item.promptType,
        item.content,
      );
      // 保存成功后清除对应缓存，下次读取时从 DB 重新加载
      invalidateCache(
        item.expert as PromptRecord['expert'],
        item.language as PromptRecord['language'],
        item.promptType,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AdminPrompts] 保存提示词失败:', error);
    return NextResponse.json({ error: '保存提示词失败' }, { status: 500 });
  }
}

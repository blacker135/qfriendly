// POST /api/chat/switch — 专家切换 SSE 流式 API

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq, asc, count } from 'drizzle-orm';
import { checkTrialAccess } from '@/lib/subscription/gate';
import { createDeepSeekClient } from '@/lib/deepseek/client';
import { getSwitchPrompt, getWelcomeMessage, getExpertInfo } from '@/lib/prompts/experts';
import type { ExpertId, Language } from '@/lib/prompts/experts';

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { conversation_id?: string; new_expert?: string; language?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { conversation_id, new_expert, language } = body;

  if (!conversation_id) {
    return Response.json({ error: 'conversation_id is required' }, { status: 400 });
  }

  const validExperts: ExpertId[] = ['evan', 'liam', 'noah', 'adrian'];
  if (!new_expert || !validExperts.includes(new_expert as ExpertId)) {
    return Response.json({ error: 'Invalid expert' }, { status: 400 });
  }

  const validLanguages: Language[] = ['en', 'zh'];
  if (!language || !validLanguages.includes(language as Language)) {
    return Response.json({ error: 'Invalid language' }, { status: 400 });
  }

  // ---- 订阅门控 ----
  const [subscription] = await db
    .select({ variant: schema.subscriptions.variantName, status: schema.subscriptions.status })
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, session.user.id));

  const isSubscribed = subscription && subscription.status === 'active';
  const variant = subscription?.variant || null;

  // 未订阅用户：原子 trial 检查
  if (!isSubscribed) {
    const trialResult = await checkTrialAccess(session.user.id);
    if (!trialResult.allowed) {
      return Response.json({
        error: 'Trial exhausted',
        code: 'TRIAL_EXHAUSTED',
        trial_used: trialResult.trialUsed,
        trial_limit: trialResult.trialLimit,
      }, { status: 402 });
    }
  }

  // Starter 用户：仅开放 Evan 和 Liam
  if (isSubscribed && variant === 'starter') {
    const starterExperts: ExpertId[] = ['evan', 'liam'];
    if (!starterExperts.includes(new_expert as ExpertId)) {
      return Response.json({
        error: 'Expert locked',
        code: 'EXPERT_LOCKED',
        message: 'Upgrade to Pro or Ultra to unlock all experts.',
      }, { status: 403 });
    }
  }
  // ---- 门控结束 ----

  const [conversation] = await db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.id, conversation_id));

  if (!conversation) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
  }
  if (conversation.userId !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const expertId = new_expert as ExpertId;
  const lang = language as Language;

  // 立即更新对话的专家（在生成过渡消息之前）
  await db
    .update(schema.conversations)
    .set({ expert: expertId, updatedAt: new Date() })
    .where(eq(schema.conversations.id, conversation_id));

  const [messagesCount] = await db
    .select({ count: count() })
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversation_id));

  // 无历史消息 → 返回欢迎语（非流式，直接返回）
  if (!messagesCount?.count || messagesCount.count === 0) {
    const welcomeMessage = getWelcomeMessage(expertId, lang);

    await db.insert(schema.messages).values({
      conversationId: conversation_id,
      role: 'assistant',
      content: welcomeMessage,
    });

    return Response.json({ content: welcomeMessage, expert: new_expert });
  }

  // 有历史 → 构建过渡 prompt + SSE 流式生成
  const recentMessages = await db
    .select({ role: schema.messages.role, content: schema.messages.content })
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversation_id))
    .orderBy(asc(schema.messages.createdAt))
    .limit(10);

  const context = recentMessages
    .map((m) => `${m.role === 'user' ? 'User' : 'Previous Guide'}: ${m.content}`)
    .join('\n\n');

  const expertInfo = getExpertInfo(expertId, lang);
  const switchPrompt = getSwitchPrompt(expertInfo.name, expertInfo.title, context, lang);

  const deepseek = createDeepSeekClient();
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let fullContent = '';
      try {
        const stream = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: switchPrompt }],
          max_tokens: 512,
          temperature: 0.8,
          stream: true,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || '';
          if (delta) {
            fullContent += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
          }
        }

        // 保存完整的过渡消息到数据库
        if (fullContent) {
          await db.insert(schema.messages).values({
            conversationId: conversation_id,
            role: 'assistant',
            content: fullContent,
          });
        } else {
          // 流式生成为空时，使用欢迎语作为降级
          const fallback = getWelcomeMessage(expertId, lang);
          await db.insert(schema.messages).values({
            conversationId: conversation_id,
            role: 'assistant',
            content: fallback,
          });
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: fallback })}\n\n`));
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        console.error('Switch stream error:', err);
        // 降级：返回欢迎语
        const fallback = getWelcomeMessage(expertId, lang);
        await db.insert(schema.messages).values({
          conversationId: conversation_id,
          role: 'assistant',
          content: fallback,
        });
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: fallback })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

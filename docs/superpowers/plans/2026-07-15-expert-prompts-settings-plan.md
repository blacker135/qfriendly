# 智能体提示词设置 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在管理后台「工具」菜单下新增智能体提示词编辑页面，允许管理员在线编辑四位 AI 专家的 System Prompt/欢迎语/切换模板（中英双语），通过 DB 存储 + 内存缓存实现实时生效。

**Architecture:** 新增 `expert_prompts` 表存储提示词，`lib/prompts/cache.ts` 提供模块级 Map 缓存，`lib/prompts/store.ts` 封装 DB 读写，修改 `experts.ts` 读取链路优先走缓存/DB、回退硬编码默认值。前端三层 Tab 编辑器（专家→语言→内容类型），PUT API 保存后清除缓存。

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 6, Tailwind CSS 4, PostgreSQL + Drizzle ORM, Better Auth 1.6, Lucide React, Fira Code font

## Global Constraints

- 项目根目录: `qfriendly/`，所有路径相对于此
- 数据库连接: `sudo -u postgres psql -d qfriendly`（peer 认证）
- 禁止本地运行项目（仅 vercel 部署）
- npm 命令需 `sudo`
- 注释: 每个模块和文件需要注释，服务层函数和接口需要注释
- 沟通语言: 中文
- 文档同步: 功能变更后检查并更新 `docs/项目文档/` 下对应文件
- 环境: Next.js 16.2+, React 19.2+, Drizzle ORM 0.45+, Tailwind 4.x
- 深色主题: background `#1A1A2E`, surface `#2D2D44`, text-primary `#E0E0E0`
- 所有 API 部署在香港区域: `export const regions = ['hkg1']`

---

## 文件结构映射

### 新建文件

```
lib/db/migrations/0010_expert_prompts.sql    # 建表 + 初始数据
lib/prompts/cache.ts                          # 内存缓存模块
lib/prompts/store.ts                          # DB 读写操作
app/api/admin/prompts/route.ts                # GET + PUT API
app/admin/prompts/page.tsx                    # Server Component 页面入口
components/admin/prompts/PromptEditor.tsx     # 客户端编辑器组件
__tests__/prompts-cache.test.ts               # 缓存单元测试
__tests__/prompts-store.test.ts               # 存储单元测试
```

### 修改文件

```
lib/db/schema.ts                              # 新增 expertPrompts 表定义
lib/prompts/experts.ts                        # 读取链路: cache→DB→default
app/admin/layout.tsx                          # 引入 Fira Code 字体
components/admin/AdminSidebar.tsx             # 「工具」组新增菜单项
```

---

### Task 1: 数据库迁移 — 建表 + 初始数据

**Files:**
- Create: `lib/db/migrations/0010_expert_prompts.sql`

**Interfaces:**
- Produces: `expert_prompts` 表（id, expert, language, prompt_type, content, updated_at），UNIQUE(expert, language, prompt_type)

- [ ] **Step 1: 创建迁移 SQL 文件**

```sql
-- lib/db/migrations/0010_expert_prompts.sql
-- 智能体提示词设置表
-- 支持四位专家 × 两种语言 × 三类内容的提示词在线编辑

CREATE TABLE expert_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert expert NOT NULL,           -- evan | liam | noah | adrian
  language language NOT NULL,       -- en | zh
  prompt_type TEXT NOT NULL,        -- 'system' | 'welcome' | 'switch'
  content TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  UNIQUE(expert, language, prompt_type)
);

-- ============================================================
-- 初始化默认数据：从 lib/prompts/experts.ts 复制硬编码内容
-- ============================================================

-- Evan Pierce — System Prompt
INSERT INTO expert_prompts (expert, language, prompt_type, content) VALUES
('evan', 'en', 'system', 'You are Evan Pierce, The Relationship Stabilizer.
Your style is calm, rational, and structured.
Your focus areas: building emotional security, reducing conflict frequency, optimizing daily communication, emotional stability guidance.
Your tone: steady, reassuring, practical. You help people feel grounded.
Important guidelines:
- Always ground your advice in emotional safety and mutual respect.
- Never suggest extreme actions or ultimatums.
- Structure your responses clearly: acknowledge the feeling, provide perspective, suggest practical steps.
- If someone is in crisis, gently suggest they also speak with Dr. Adrian Cole.
- Reply in English.'),
('evan', 'zh', 'system', '你是 Evan Pierce，情感稳定者。
你的风格：冷静、理性、结构化。
你的擅长领域：建立情感安全感、降低冲突频率、优化日常沟通、情绪稳定指导。
你的语调：稳重、让人安心、实用。你帮助人们找到内心的平稳。
重要准则：
- 所有建议必须建立在情感安全和相互尊重的基础上。
- 永远不要建议极端行为或最后通牒。
- 清晰结构化你的回复：先肯定感受，再提供视角，最后给出实际步骤。
- 如果对方处于危机中，温和地建议他们也和 Dr. Adrian Cole 聊聊。
- 用中文回复。');

-- Liam Hart — System Prompt
INSERT INTO expert_prompts (expert, language, prompt_type, content) VALUES
('liam', 'en', 'system', 'You are Liam Hart, The Relationship Gardener.
Your style is warm, supportive, and gently coaching.
Your focus areas: daily relationship maintenance, emotional lubrication, preventing small issues from escalating, making relationships feel comfortable.
Your tone: like a caring friend who truly listens. You make people feel heard and understood.
Important guidelines:
- Lead with empathy. Always acknowledge the emotional experience before offering guidance.
- Keep advice practical and easy to apply in everyday life.
- Use warm, conversational language — avoid clinical or analytical tones.
- Remind people that relationships take care and attention, just like a garden.
- Reply in English.'),
('liam', 'zh', 'system', '你是 Liam Hart，情感园丁。
你的风格：温暖、支持、温柔引导。
你的擅长领域：日常关系维护、情绪润滑、防止小问题升级、让关系更舒服。
你的语调：像一个真正倾听的、关心你的朋友。你让人们感到被听见、被理解。
重要准则：
- 以共情为先。在给出建议之前，总是先确认对方的情绪体验。
- 建议要实用，易于在日常生活中应用。
- 使用温暖、对话式的语言——避免临床或分析式的语调。
- 提醒人们关系需要像花园一样被呵护和关注。
- 用中文回复。');

-- Noah Sinclair — System Prompt
INSERT INTO expert_prompts (expert, language, prompt_type, content) VALUES
('noah', 'en', 'system', 'You are Noah Sinclair, The Attraction Strategist.
Your style is insightful, slightly playful, and psychologically sharp.
Your focus areas: building attraction, navigating ambiguity, conversation strategy, designing relationship escalation.
Your tone: confident, perceptive, lightly charismatic. You read between the lines.
Important guidelines:
- Be perceptive about what people aren''t saying directly.
- Offer strategic insights grounded in psychological understanding, not pickup tricks.
- Be confident but never manipulative. The goal is authentic connection.
- Encourage people to understand themselves better, not just the other person.
- Reply in English.'),
('noah', 'zh', 'system', '你是 Noah Sinclair，吸引策略师。
你的风格：洞察力强、略带玩味、心理敏锐。
你的擅长领域：吸引力提升、暧昧推进、聊天策略、关系升温设计。
你的语调：自信、敏锐、略带魅力。你善于读懂言外之意。
重要准则：
- 敏锐地察觉人们没有直接说出口的事情。
- 提供基于心理学理解的策略洞察，而非搭讪技巧。
- 自信但绝不操纵。目标是真实的连接。
- 鼓励人们更好地理解自己，而不仅仅是对方。
- 用中文回复。');

-- Adrian Cole — System Prompt
INSERT INTO expert_prompts (expert, language, prompt_type, content) VALUES
('adrian', 'en', 'system', 'You are Dr. Adrian Cole, The Relationship Intervention Specialist.
Your style is clinical but empathetic, structured, and non-judgmental.
Your focus areas: cold war repair, breakup crisis management, trust breakdown analysis, rational recovery strategy.
Your tone: professional yet warm. You help people think clearly when emotions are overwhelming.
Important guidelines:
- Create immediate emotional safety. People coming to you are in pain.
- Structure is healing: help people organize chaotic thoughts into clear patterns.
- Never judge. People need to feel safe admitting difficult things.
- Distinguish between salvageable patterns and genuinely toxic dynamics.
- If someone describes abuse, clearly name it and direct them to professional help.
- Reply in English.'),
('adrian', 'zh', 'system', '你是 Dr. Adrian Cole，情感干预专家。
你的风格：临床而共情、结构化、不带评判。
你的擅长领域：冷战修复、分手危机处理、信任崩塌分析、理性挽回策略。
你的语调：专业而温暖。当情绪压倒一切时，你帮助人们保持清晰的思考。
重要准则：
- 首先建立情感安全感。来找你的人是带着伤痛来的。
- 结构本身就具有疗愈作用：帮助人们把混乱的思绪整理成清晰的模式。
- 永远不评判。人们需要感到安全才能说出困难的事情。
- 区分可挽救的模式和真正有毒的关系动态。
- 如果有人描述了虐待行为，清晰地指出并引导他们寻求专业帮助。
- 用中文回复。');

-- Evan — 欢迎语
INSERT INTO expert_prompts (expert, language, prompt_type, content) VALUES
('evan', 'en', 'welcome', 'Hello. I''m Evan Pierce. If you''re feeling uncertain or things feel a bit shaky right now, you''re in the right place. My focus is on helping you build a steady foundation — one that feels safe, calm, and secure. Where would you like to start?'),
('evan', 'zh', 'welcome', '你好，我是 Evan Pierce。如果你此刻感到不确定，或者一切有些摇晃——你来对地方了。我的职责是帮你建立一个稳固的基础——安全、冷静、踏实。你想从哪里开始？');

-- Liam — 欢迎语
INSERT INTO expert_prompts (expert, language, prompt_type, content) VALUES
('liam', 'en', 'welcome', 'Hey there. I''m Liam. Think of me as a friend who''s here to help make love feel a little easier and a little softer. Whatever''s on your mind — big or small — I''m here to listen. What''s been on your heart lately?'),
('liam', 'zh', 'welcome', '嗨，我是 Liam。你可以把我想象成一个帮你让爱变得更轻松、更柔软的朋友。无论你心里想的是什么——大事还是小事——我都在这里倾听。最近你心里装着什么？');

-- Noah — 欢迎语
INSERT INTO expert_prompts (expert, language, prompt_type, content) VALUES
('noah', 'en', 'welcome', 'Hey. I''m Noah. If you''re looking to bring more excitement, closeness, or spark into your relationship — you''ve come to the right person. I''m here to help you understand the dynamics between you and someone you care about. What''s the situation?'),
('noah', 'zh', 'welcome', '嗨，我是 Noah。如果你想在关系中注入更多兴奋、亲密和火花——你找对人了。我在这里帮你理解你和在乎的那个人之间的动态。说说你的情况？');

-- Adrian — 欢迎语
INSERT INTO expert_prompts (expert, language, prompt_type, content) VALUES
('adrian', 'en', 'welcome', 'Hello. I''m Dr. Adrian Cole. If things feel like they''re unraveling right now — take a breath. You don''t have to figure everything out in this moment. We''ll take it step by step, together. What''s weighing on you?'),
('adrian', 'zh', 'welcome', '你好，我是 Dr. Adrian Cole。如果此刻一切似乎在分崩离析——先深呼吸。你不需要在这一刻解决所有问题。我们会一步一步来，一起。是什么压在你心上？');

-- 切换过渡模板 — 英文
INSERT INTO expert_prompts (expert, language, prompt_type, content) VALUES
('evan', 'en', 'switch', 'You are {name}, {title}.
You just joined this conversation as a new guide.

Context so far:
{context}

Please do the following:
1. Greet the user warmly in your unique style.
2. Briefly summarize what they''ve been discussing — show you''ve been paying attention.
3. Offer a gentle transition question to continue the conversation in your area of expertise.

Keep it concise — 3-4 sentences total. Do NOT use placeholders or labels like ''1. 2. 3.'' — just speak naturally.'),
('liam', 'en', 'switch', 'You are {name}, {title}.
You just joined this conversation as a new guide.

Context so far:
{context}

Please do the following:
1. Greet the user warmly in your unique style.
2. Briefly summarize what they''ve been discussing — show you''ve been paying attention.
3. Offer a gentle transition question to continue the conversation in your area of expertise.

Keep it concise — 3-4 sentences total. Do NOT use placeholders or labels like ''1. 2. 3.'' — just speak naturally.'),
('noah', 'en', 'switch', 'You are {name}, {title}.
You just joined this conversation as a new guide.

Context so far:
{context}

Please do the following:
1. Greet the user warmly in your unique style.
2. Briefly summarize what they''ve been discussing — show you''ve been paying attention.
3. Offer a gentle transition question to continue the conversation in your area of expertise.

Keep it concise — 3-4 sentences total. Do NOT use placeholders or labels like ''1. 2. 3.'' — just speak naturally.'),
('adrian', 'en', 'switch', 'You are {name}, {title}.
You just joined this conversation as a new guide.

Context so far:
{context}

Please do the following:
1. Greet the user warmly in your unique style.
2. Briefly summarize what they''ve been discussing — show you''ve been paying attention.
3. Offer a gentle transition question to continue the conversation in your area of expertise.

Keep it concise — 3-4 sentences total. Do NOT use placeholders or labels like ''1. 2. 3.'' — just speak naturally.');

-- 切换过渡模板 — 中文
INSERT INTO expert_prompts (expert, language, prompt_type, content) VALUES
('evan', 'zh', 'switch', '你是{name}，{title}。
你刚刚作为新的顾问加入了这场对话。

以下是此前的对话背景：
{context}

请完成以下内容：
1. 用你独特的风格温暖地打招呼。
2. 简要总结他们之前在讨论的内容——让他们感到你一直在倾听。
3. 提出一个温和的过渡问题，引导对话进入你擅长的领域。

保持简洁——总共 3-4 句话。不要使用''1. 2. 3.''这样的标签——自然地说出来。'),
('liam', 'zh', 'switch', '你是{name}，{title}。
你刚刚作为新的顾问加入了这场对话。

以下是此前的对话背景：
{context}

请完成以下内容：
1. 用你独特的风格温暖地打招呼。
2. 简要总结他们之前在讨论的内容——让他们感到你一直在倾听。
3. 提出一个温和的过渡问题，引导对话进入你擅长的领域。

保持简洁——总共 3-4 句话。不要使用''1. 2. 3.''这样的标签——自然地说出来。'),
('noah', 'zh', 'switch', '你是{name}，{title}。
你刚刚作为新的顾问加入了这场对话。

以下是此前的对话背景：
{context}

请完成以下内容：
1. 用你独特的风格温暖地打招呼。
2. 简要总结他们之前在讨论的内容——让他们感到你一直在倾听。
3. 提出一个温和的过渡问题，引导对话进入你擅长的领域。

保持简洁——总共 3-4 句话。不要使用''1. 2. 3.''这样的标签——自然地说出来。'),
('adrian', 'zh', 'switch', '你是{name}，{title}。
你刚刚作为新的顾问加入了这场对话。

以下是此前的对话背景：
{context}

请完成以下内容：
1. 用你独特的风格温暖地打招呼。
2. 简要总结他们之前在讨论的内容——让他们感到你一直在倾听。
3. 提出一个温和的过渡问题，引导对话进入你擅长的领域。

保持简洁——总共 3-4 句话。不要使用''1. 2. 3.''这样的标签——自然地说出来。');
```

- [ ] **Step 2: 执行迁移**

```bash
sudo -u postgres psql -d qfriendly -f lib/db/migrations/0010_expert_prompts.sql
```

- [ ] **Step 3: 验证表创建成功**

```bash
sudo -u postgres psql -d qfriendly -c "SELECT expert, language, prompt_type, LEFT(content, 40) FROM expert_prompts ORDER BY expert, language, prompt_type;"
```

Expected: 24 rows（4 专家 × 2 语言 × 3 类型）

- [ ] **Step 4: Commit**

```bash
git add lib/db/migrations/0010_expert_prompts.sql
git commit -m "feat(db): add expert_prompts table with default seed data"
```

---

### Task 2: Drizzle Schema — 新增 expertPrompts 表定义

**Files:**
- Modify: `lib/db/schema.ts`

**Interfaces:**
- Produces: `schema.expertPrompts` — Drizzle pgTable，供 store.ts 和 API route 使用

- [ ] **Step 1: 在 `lib/db/schema.ts` 末尾添加表定义**

在文件末尾（`analyticsSettings` 定义之后）添加:

```ts
// ============================================================
// 专家提示词设置表
// 支持管理员在线编辑四位专家的 System Prompt / 欢迎语 / 切换模板
// ============================================================

export const expertPrompts = pgTable('expert_prompts', {
  id: uuid('id').defaultRandom().primaryKey(),
  expert: expertEnum('expert').notNull(),
  language: languageEnum('language').notNull(),
  promptType: text('prompt_type').notNull(), // 'system' | 'welcome' | 'switch'
  content: text('content').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueConstraint: uniqueIndex('idx_expert_prompts_unique')
    .on(table.expert, table.language, table.promptType),
}));
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && sudo npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: No errors related to schema.ts

- [ ] **Step 3: Commit**

```bash
git add lib/db/schema.ts
git commit -m "feat(db): add expertPrompts Drizzle schema definition"
```

---

### Task 3: 缓存模块 — `lib/prompts/cache.ts`

**Files:**
- Create: `lib/prompts/cache.ts`

**Interfaces:**
- Produces:
  - `getCachedPrompt(expert, lang, type): string | null`
  - `setCachedPrompt(expert, lang, type, content): void`
  - `invalidateCache(expert, lang, type): void`
  - `clearAllCache(): void`

- [ ] **Step 1: 创建缓存模块**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/prompts/cache.ts
git commit -m "feat(prompts): add in-memory cache module for expert prompts"
```

---

### Task 4: 存储模块 — `lib/prompts/store.ts`

**Files:**
- Create: `lib/prompts/store.ts`

**Interfaces:**
- Consumes: `schema.expertPrompts`（from Task 2）
- Produces:
  - `getPromptFromDB(expert, lang, type): Promise<string | null>`
  - `upsertPrompt(expert, lang, type, content): Promise<void>`
  - `getAllPromptsFromDB(filters?): Promise<PromptRecord[]>`
  - `PromptRecord` type

- [ ] **Step 1: 创建存储模块**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/prompts/store.ts
git commit -m "feat(prompts): add DB store module for expert prompts CRUD"
```

---

### Task 5: 修改 `experts.ts` — 读取链路改造

**Files:**
- Modify: `lib/prompts/experts.ts`

**Interfaces:**
- Consumes: `getCachedPrompt` / `setCachedPrompt`（from Task 3）, `getPromptFromDB`（from Task 4）
- Modified: `getExpertPrompt()`, `getWelcomeMessage()`, `getSwitchPrompt()` — 优先走缓存→DB→硬编码默认值

- [ ] **Step 1: 修改三个公开函数的实现**

在 `lib/prompts/experts.ts` 顶部添加 import:

```ts
import { getCachedPrompt, setCachedPrompt } from './cache';
import { getPromptFromDB } from './store';
```

修改 `getExpertPrompt` 函数（替换原有单行 return）:

```ts
/**
 * 获取指定专家的 System Prompt（根据语言选择）
 * 优先级: 内存缓存 → DB → 硬编码默认值
 *
 * @param expertId - 专家标识符 ('evan' | 'liam' | 'noah' | 'adrian')
 * @param language - 语言 ('en' | 'zh')
 * @returns 对应语言的角色设定提示词
 */
export function getExpertPrompt(expertId: ExpertId, language: Language): string {
  // 1. 尝试缓存
  const cached = getCachedPrompt(expertId, language, 'system');
  if (cached !== null) return cached;

  // 2. 尝试 DB（同步内异步用 await 包装 — 但此函数现有调用方都是 async context）
  //    改为 async 函数，修改调用方
  //    为保持向后兼容，采用同步缓存 + 异步 DB 回退模式
  //    如果缓存未命中，返回默认值，同时在后台从 DB 加载到缓存
  const defaultPrompt = BASE_PROMPTS[expertId][language];

  // 触发异步 DB 加载（fire-and-forget，下次请求即可命中缓存）
  getPromptFromDB(expertId, language, 'system').then((dbContent) => {
    if (dbContent !== null) {
      setCachedPrompt(expertId, language, 'system', dbContent);
    }
  });

  return defaultPrompt;
}
```

同样的方式修改 `getWelcomeMessage`:

```ts
/**
 * 获取指定专家的默认欢迎语
 * 优先级: 内存缓存 → DB → 硬编码默认值
 */
export function getWelcomeMessage(expertId: ExpertId, language: Language): string {
  const cached = getCachedPrompt(expertId, language, 'welcome');
  if (cached !== null) return cached;

  const defaultMsg = WELCOME_MESSAGES[expertId][language];

  getPromptFromDB(expertId, language, 'welcome').then((dbContent) => {
    if (dbContent !== null) {
      setCachedPrompt(expertId, language, 'welcome', dbContent);
    }
  });

  return defaultMsg;
}
```

修改 `getSwitchPrompt`——切换模板按专家分别存储:

```ts
/**
 * 获取切换专家时的过渡提示词
 * 优先级: 内存缓存 → DB → 硬编码模板（全局模板，回退用）
 */
export function getSwitchPrompt(
  name: string,
  title: string,
  context: string,
  language: Language,
  expertId: ExpertId,
): string {
  const cached = getCachedPrompt(expertId, language, 'switch');
  let template: string;
  if (cached !== null) {
    template = cached;
  } else {
    // 回退到全局模板
    template = language === 'en' ? SWITCH_PROMPT_EN : SWITCH_PROMPT_ZH;

    // 触发异步加载
    getPromptFromDB(expertId, language, 'switch').then((dbContent) => {
      if (dbContent !== null) {
        setCachedPrompt(expertId, language, 'switch', dbContent);
      }
    });
  }

  return template
    .replace('{name}', name)
    .replace('{title}', title)
    .replace('{context}', context);
}
```

> **注意:** `getSwitchPrompt` 签名新增了 `expertId` 参数。需要找到所有调用方同步更新。

- [ ] **Step 2: 找到并更新 `getSwitchPrompt` 的调用方**

```bash
grep -rn "getSwitchPrompt" /home/ubuntu/project/ai/start01-qfriendly/qfriendly --include="*.ts" --include="*.tsx"
```

在调用处传入 `expertId` 参数（需要从上下文中获取当前专家标识）。

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && sudo npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/prompts/experts.ts
# 如果有调用方修改也一并添加
git commit -m "feat(prompts): update reading chain — cache → DB → hardcoded default"
```

---

### Task 6: API Route — `GET` + `PUT` `/api/admin/prompts`

**Files:**
- Create: `app/api/admin/prompts/route.ts`

**Interfaces:**
- Consumes: `getAdminUserId`（from guard.ts）, `getAllPromptsFromDB` / `upsertPrompt`（from store.ts）, `invalidateCache`（from cache.ts）
- Produces: `GET /api/admin/prompts` → `{ prompts: PromptRecord[] }`, `PUT /api/admin/prompts` → `{ success: true }`

- [ ] **Step 1: 创建 API route**

```ts
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
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && sudo npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add app/api/admin/prompts/route.ts
git commit -m "feat(api): add GET/PUT /api/admin/prompts with validation and cache invalidation"
```

---

### Task 7: Admin Layout — 引入 Fira Code 字体

**Files:**
- Modify: `app/admin/layout.tsx`

**Interfaces:**
- Produces: 管理后台所有页面可使用 `font-mono` class 获取 Fira Code 等宽字体

- [ ] **Step 1: 在 admin layout 中添加 Google Fonts 链接**

在 `app/admin/layout.tsx` 的 `AdminRootLayout` 组件中，在 `<AdminLayout>` 之前添加字体加载:

```tsx
// app/admin/layout.tsx
// 管理后台根布局 — 服务端权限校验 + 编辑器字体加载

import { auth } from '@/lib/auth';
import { isAdmin } from '@/lib/admin/guard';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import AdminLayout from '@/components/admin/AdminLayout';

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  if (!userId) {
    redirect('/auth/login');
  }

  const admin = await isAdmin(userId);
  if (!admin) {
    redirect('/');
  }

  return (
    <>
      {/* Fira Code 等宽字体 — 用于智能体提示词编辑器 */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <AdminLayout>{children}</AdminLayout>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat(admin): add Fira Code font for prompt editor"
```

---

### Task 8: PromptEditor 组件

**Files:**
- Create: `components/admin/prompts/PromptEditor.tsx`

**Interfaces:**
- Consumes: `GET /api/admin/prompts`, `PUT /api/admin/prompts`
- Produces: 完整三层 Tab 编辑器，管理 24 条提示词

- [ ] **Step 1: 创建 PromptEditor 组件**

```tsx
'use client';
// components/admin/prompts/PromptEditor.tsx
// 智能体提示词编辑器 — 三层 Tab：专家 → 语言 → 内容类型
// 深色主题 + Fira Code 等宽字体 + 响应式布局

import { useState, useEffect, useCallback } from 'react';
import { Shield, Sprout, Sparkles, HeartPulse, Loader2, CheckCircle2, XCircle } from 'lucide-react';

// ============================================================
// 类型定义
// ============================================================

type ExpertId = 'evan' | 'liam' | 'noah' | 'adrian';
type Language = 'en' | 'zh';
type PromptType = 'system' | 'welcome' | 'switch';

interface PromptRecord {
  id: string;
  expert: ExpertId;
  language: Language;
  promptType: PromptType;
  content: string;
  updatedAt: string;
}

/** 专家 Tab 配置 */
const EXPERT_TABS: { id: ExpertId; name: string; titleZh: string; color: string; icon: React.ElementType }[] = [
  { id: 'evan',  name: 'Evan Pierce',  titleZh: '情感稳定者', color: '#4A90D9', icon: Shield },
  { id: 'liam',  name: 'Liam Hart',    titleZh: '情感园丁',   color: '#5BA88C', icon: Sprout },
  { id: 'noah',  name: 'Noah Sinclair',titleZh: '吸引策略师', color: '#D4A843', icon: Sparkles },
  { id: 'adrian',name: 'Dr. Adrian Cole',titleZh:'情感干预专家',color:'#C45C5C',icon: HeartPulse },
];

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'English' },
];

const PROMPT_TYPES: { id: PromptType; label: string; rows: number }[] = [
  { id: 'system', label: 'System Prompt', rows: 15 },
  { id: 'welcome', label: '欢迎语', rows: 5 },
  { id: 'switch', label: '切换过渡模板', rows: 10 },
];

/** 根据内容类型获取最小高度 */
function getMinHeight(type: PromptType): string {
  switch (type) {
    case 'system': return 'min-h-[320px]';
    case 'welcome': return 'min-h-[140px]';
    case 'switch': return 'min-h-[220px]';
  }
}

// ============================================================
// Toast 子组件
// ============================================================

function Toast({ type, message, onClose }: { type: 'success' | 'error'; message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';
  const Icon = isSuccess ? CheckCircle2 : XCircle;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 text-sm border motion-safe:animate-[toastIn_200ms_ease-out] ${
        isSuccess
          ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]'
          : 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]'
      }`}
      role="alert"
    >
      <Icon size={16} />
      <span>{message}</span>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

export default function PromptEditor() {
  // 编辑内容
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');

  // 全量数据缓存: key = `${expert}:${lang}:${type}`
  const [allPrompts, setAllPrompts] = useState<Map<string, PromptRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 当前选中状态
  const [activeExpert, setActiveExpert] = useState<ExpertId>('evan');
  const [activeLang, setActiveLang] = useState<Language>('zh');
  const [activeType, setActiveType] = useState<PromptType>('system');

  // 保存状态
  const [saveState, setSaveState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  /** 生成 Map key */
  const mapKey = useCallback((expert: ExpertId, lang: Language, type: PromptType) =>
    `${expert}:${lang}:${type}`, []);

  /** 从 API 加载全部数据 */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/admin/prompts');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const map = new Map<string, PromptRecord>();
        for (const p of data.prompts as PromptRecord[]) {
          map.set(mapKey(p.expert, p.language, p.promptType), p);
        }
        setAllPrompts(map);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mapKey]);

  /** 当选中项或数据变化时，更新编辑区内容 */
  useEffect(() => {
    const key = mapKey(activeExpert, activeLang, activeType);
    const record = allPrompts.get(key);
    const text = record?.content ?? '';
    setContent(text);
    setOriginalContent(text);
  }, [activeExpert, activeLang, activeType, allPrompts, mapKey]);

  /** 切换 Tab 前保存当前编辑内容到 Map */
  const switchTab = useCallback((expert: ExpertId, lang: Language, type: PromptType) => {
    // 保存当前编辑内容
    const currentKey = mapKey(activeExpert, activeLang, activeType);
    if (content !== originalContent) {
      setAllPrompts((prev) => {
        const next = new Map(prev);
        const existing = next.get(currentKey);
        if (existing) {
          next.set(currentKey, { ...existing, content });
        }
        return next;
      });
    }
    // 切换
    setActiveExpert(expert);
    setActiveLang(lang);
    setActiveType(type);
  }, [activeExpert, activeLang, activeType, content, originalContent, mapKey]);

  /** 保存当前编辑区 */
  const handleSave = async () => {
    if (content.trim().length === 0) return;

    setSaveState('loading');
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: [{ expert: activeExpert, language: activeLang, promptType: activeType, content }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      // 更新本地缓存 + 原始值
      setOriginalContent(content);
      const key = mapKey(activeExpert, activeLang, activeType);
      setAllPrompts((prev) => {
        const next = new Map(prev);
        const existing = next.get(key);
        next.set(key, { ...(existing || { id: '', updatedAt: '' }), content, updatedAt: new Date().toISOString() } as PromptRecord);
        return next;
      });

      setSaveState('success');
      setToast({ type: 'success', message: '保存成功' });
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (err) {
      setSaveState('error');
      setToast({ type: 'error', message: err instanceof Error ? err.message : '保存失败，请重试' });
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  /** 当前记录的最后更新时间 */
  const currentRecord = allPrompts.get(mapKey(activeExpert, activeLang, activeType));
  const lastUpdated = currentRecord?.updatedAt
    ? new Date(currentRecord.updatedAt).toLocaleString('zh-CN', { hour12: false })
    : null;

  // ============================================================
  // 渲染
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-[#999999]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-[#EF4444]">
        加载失败: {error}
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto space-y-5">
      {/* 页面标题 */}
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">智能体提示词</h1>

      {/* 第一层 — 专家 Tab */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {EXPERT_TABS.map((expert) => {
          const active = activeExpert === expert.id;
          return (
            <button
              key={expert.id}
              onClick={() => switchTab(expert.id, activeLang, activeType)}
              className={`cursor-pointer flex items-center gap-2 px-5 py-3 rounded-lg text-left transition-all duration-200 motion-safe:transition-all motion-reduce:transition-none ${
                active
                  ? 'bg-[#363652] border-l-[3px] text-[#E0E0E0]'
                  : 'bg-transparent text-[#999999] hover:bg-[#2D2D44]/50'
              }`}
              style={active ? { borderLeftColor: expert.color } : undefined}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: expert.color }}
              />
              <div>
                <div className="text-sm font-medium">{expert.name}</div>
                <div className="text-xs text-[#999999]">{expert.titleZh}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 第二层 — 语言 Tab */}
      <div className="flex justify-end gap-2">
        {LANGUAGES.map((lang) => {
          const active = activeLang === lang.id;
          return (
            <button
              key={lang.id}
              onClick={() => switchTab(activeExpert, lang.id, activeType)}
              className={`cursor-pointer px-3 py-1.5 text-sm rounded-full transition-colors duration-200 ${
                active
                  ? 'bg-[#FF7A59]/15 text-[#FF7A59] font-medium'
                  : 'text-[#999999] hover:text-[#E0E0E0]'
              }`}
            >
              {lang.label}
            </button>
          );
        })}
      </div>

      {/* 第三层 — 内容类型 Tab */}
      <div className="flex border-b border-[rgba(255,255,255,0.06)]">
        {PROMPT_TYPES.map((pt) => {
          const active = activeType === pt.id;
          return (
            <button
              key={pt.id}
              onClick={() => switchTab(activeExpert, activeLang, pt.id)}
              className={`cursor-pointer flex-1 text-center pb-2.5 text-sm transition-colors duration-200 ${
                active
                  ? 'text-[#E0E0E0] border-b-2 border-[#FF7A59] font-medium'
                  : 'text-[#999999] hover:text-[#E0E0E0]'
              }`}
            >
              {pt.label}
            </button>
          );
        })}
      </div>

      {/* 编辑区 */}
      <div className="bg-[var(--surface)] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
        <label htmlFor="prompt-editor" className="sr-only">
          {EXPERT_TABS.find((e) => e.id === activeExpert)?.name} · {LANGUAGES.find((l) => l.id === activeLang)?.label} · {PROMPT_TYPES.find((t) => t.id === activeType)?.label}
        </label>
        <textarea
          id="prompt-editor"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={`w-full bg-transparent font-mono text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[#6B6B80] p-5 resize-y focus:outline-none focus:border-[#FF7A59] focus:ring-1 focus:ring-[#FF7A59]/30 transition-colors duration-200 ${getMinHeight(activeType)}`}
          placeholder={`输入 ${PROMPT_TYPES.find((t) => t.id === activeType)?.label}...`}
          rows={PROMPT_TYPES.find((t) => t.id === activeType)?.rows}
        />
      </div>

      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-[var(--text-secondary)]">
          {lastUpdated
            ? `最后更新: ${lastUpdated}`
            : '尚未自定义，使用默认值'}
        </div>

        <button
          onClick={handleSave}
          disabled={saveState === 'loading' || content.trim().length === 0}
          className="cursor-pointer inline-flex items-center gap-2 bg-[#FF7A59] hover:bg-[#FF8C70] text-white font-medium px-6 py-2.5 rounded-lg min-w-[120px] min-h-[44px] transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#FF7A59]/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveState === 'loading' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              保存中...
            </>
          ) : saveState === 'success' ? (
            <>
              <CheckCircle2 size={16} />
              已保存
            </>
          ) : (
            '保存修改'
          )}
        </button>
      </div>

      {/* Toast 通知 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 添加到 globals.css（Toast 入场动画 keyframe）**

在 `app/globals.css` 的 utilities 区域添加:

```css
@keyframes toastIn {
  from { transform: translateY(16px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/prompts/PromptEditor.tsx app/globals.css
git commit -m "feat(admin): add PromptEditor component with 3-layer tab navigation"
```

---

### Task 9: Admin 页面入口 — `/admin/prompts`

**Files:**
- Create: `app/admin/prompts/page.tsx`

**Interfaces:**
- Consumes: `PromptEditor`（from Task 8）
- Produces: `/admin/prompts` 页面

- [ ] **Step 1: 创建页面文件**

```tsx
// app/admin/prompts/page.tsx
// 智能体提示词设置页面 — Server Component 入口
// 权限校验由父布局 app/admin/layout.tsx 完成

import type { Metadata } from 'next';
import PromptEditor from '@/components/admin/prompts/PromptEditor';

export const metadata: Metadata = {
  title: '智能体提示词 — QFriendly 管理后台',
};

export default function PromptsPage() {
  return <PromptEditor />;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/admin/prompts/page.tsx
git commit -m "feat(admin): add /admin/prompts page entry"
```

---

### Task 10: 侧边栏菜单 — 新增「智能体提示词」

**Files:**
- Modify: `components/admin/AdminSidebar.tsx`

**Interfaces:**
- Consumes: `Bot` icon from lucide-react（新增 import）
- Produces: 「工具」分组中新增菜单项，位于「报表导出」之前

- [ ] **Step 1: 修改 AdminSidebar**

在 `components/admin/AdminSidebar.tsx` 中:

添加 `Bot` 到 lucide-react import:

```tsx
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  Download,
  Settings,
  Bot,           // ← 新增
} from 'lucide-react';
```

在 `navGroups` 的「工具」分组中，在「报表导出」之前插入:

```tsx
{
  label: '工具',
  items: [
    { href: '/admin/reports', label: '报表导出', icon: Download },
    { href: '/admin/prompts', label: '智能体提示词', icon: Bot },  // ← 新增
    { href: '/admin/settings', label: '统计设置', icon: Settings },
  ],
},
```

- [ ] **Step 2: Commit**

```bash
git add components/admin/AdminSidebar.tsx
git commit -m "feat(admin): add prompts menu item to sidebar tools group"
```

---

### Task 11: 单元测试

**Files:**
- Create: `__tests__/prompts-cache.test.ts`
- Create: `__tests__/prompts-store.test.ts`

**Interfaces:**
- Consumes: `getCachedPrompt` / `setCachedPrompt` / `invalidateCache` / `clearAllCache` (from cache.ts)

- [ ] **Step 1: 创建缓存模块测试**

```ts
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
```

- [ ] **Step 2: 运行缓存测试**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && sudo npx vitest run __tests__/prompts-cache.test.ts
```

Expected: 6 tests PASS

- [ ] **Step 3: 运行全量测试确保无回归**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && sudo npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add __tests__/prompts-cache.test.ts
git commit -m "test(prompts): add cache module unit tests"
```

---

### Task 12: 文档更新

**Files:**
- Modify: `docs/项目文档/api接口设计文档.md`
- Modify: `docs/项目文档/数据库文档.md`
- Modify: `docs/项目文档/UI设计文档.md`
- Modify: `docs/superpowers/specs/2026-07-15-expert-prompts-settings-design.md`

- [ ] **Step 1: 更新 API 接口文档**

在接口总览表中新增:

```
| 管理 | GET | /api/admin/prompts | 获取所有专家提示词 |
| 管理 | PUT | /api/admin/prompts | 批量保存专家提示词 |
```

并新增「专家提示词模块」小节，包含请求/响应格式和校验规则。

- [ ] **Step 2: 更新数据库文档**

在表分组中新增 `expert_prompts`，添加表结构说明。更新总表数为 17 张。在迁移历史中添加:

```
| 0010_expert_prompts | 新增 expert_prompts 表 — 支持管理员在线编辑专家提示词 |
```

- [ ] **Step 3: 更新 UI 设计文档**

在组件体系中新增 `prompts/PromptEditor` 条目。

- [ ] **Step 4: 更新 spec 文件的 commit 引用**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && git log --oneline -1
# 获取最新 commit hash，填入 spec 头部
```

- [ ] **Step 5: 更新所有文档的「最后更新」日期**

改为 `2026-07-15`。

- [ ] **Step 6: Commit**

```bash
git add docs/
git commit -m "docs: update API/DB/UI docs for expert prompts feature"
```

---

### Task 13: 部署

**Files:**
- 无新建文件

- [ ] **Step 1: 推送到 GitHub**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && git push origin master
```

- [ ] **Step 2: 检查 Vercel 部署状态**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && vercel ls
```

- [ ] **Step 3: 执行数据库迁移（在服务器上）**

```bash
sudo -u postgres psql -d qfriendly -f lib/db/migrations/0010_expert_prompts.sql
```

- [ ] **Step 4: 验证线上功能**

访问 `https://qfriendly.qfxblacker.top/admin/prompts`，确认页面加载正常、可编辑、可保存。

---

## 实施顺序依赖

```
Task 1 (SQL 迁移)
  └→ Task 2 (Drizzle Schema)
       └→ Task 4 (Store 模块)
            ├→ Task 5 (experts.ts 改造)
            └→ Task 6 (API Route)
                 └→ Task 8 (PromptEditor 组件)
                      └→ Task 9 (Page 入口)
Task 3 (Cache 模块) — 独立，可与 Task 2-4 并行
Task 7 (字体加载) — 独立，可在 Task 8 之前任意时机
Task 10 (侧边栏菜单) — 独立，Task 8-9 之后
Task 11 (测试) — Task 3 之后即可
Task 12 (文档) — 全部代码完成后
Task 13 (部署) — 全部完成 + 文档更新后
```

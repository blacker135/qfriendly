# Lunara 去 Supabase 化 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Supabase (Auth + DB + SDK) 替换为 Better Auth + Drizzle ORM + 本地 PostgreSQL 16

**Architecture:** Better Auth 处理邮箱密码认证和 session 管理，Drizzle ORM 负责数据库查询和迁移，本地 PG 16 作为数据库。Next.js middleware 简化为仅处理 next-intl 路由，Auth 保护在 API 层和 Server Component 层完成。

**Tech Stack:** Better Auth (auth), Drizzle ORM + drizzle-kit (DB), pg (node-postgres), Next.js 16, TypeScript

---

### Task 1: 依赖更新

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 移除 Supabase 依赖**

```bash
cd /home/ml/project/ai/mvp/star1-relation/.worktrees/lunara-mvp
npm uninstall @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: 安装新依赖**

```bash
npm install better-auth drizzle-orm pg
npm install -D drizzle-kit @types/pg
```

- [ ] **Step 3: 验证 package.json 变更正确**

```bash
node -e "
const p = require('./package.json');
const deps = {...p.dependencies, ...p.devDependencies};
const removed = ['@supabase/supabase-js', '@supabase/ssr'];
const added = ['better-auth', 'drizzle-orm', 'pg', 'drizzle-kit', '@types/pg'];
for (const r of removed) if (deps[r]) { console.error('FAIL: not removed', r); process.exit(1); }
for (const a of added) if (!deps[a]) { console.error('FAIL: not added', a); process.exit(1); }
console.log('OK: dependencies correct');
"
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: replace supabase deps with better-auth + drizzle-orm + pg"
```

---

### Task 2: 数据库层 — Drizzle Schema + 客户端

**Files:**
- Create: `lib/db/schema.ts`
- Create: `lib/db/index.ts`
- Create: `drizzle.config.ts`

- [ ] **Step 1: 创建 lib/db/schema.ts**

```typescript
// lib/db/schema.ts
// Drizzle ORM 数据库 Schema 定义
// 包含 Better Auth 认证表 + Lunara 业务表

import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ============================================================
// Better Auth 认证表
// ============================================================

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

// ============================================================
// Lunara 业务表
// ============================================================

export const expertEnum = pgEnum('expert', ['evan', 'liam', 'noah', 'adrian']);
export const languageEnum = pgEnum('language', ['en', 'zh']);
export const roleEnum = pgEnum('message_role', ['user', 'assistant']);

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  nickname: text('nickname'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  expert: expertEnum('expert').notNull(),
  language: languageEnum('language').notNull().default('en'),
  title: text('title').default('New Conversation'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

- [ ] **Step 2: 创建 drizzle.config.ts**

```typescript
// drizzle.config.ts
// Drizzle Kit 配置文件，指向 schema 和迁移输出目录

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 3: 创建 lib/db/index.ts**

```typescript
// lib/db/index.ts
// Drizzle 数据库客户端实例

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export { schema };
```

- [ ] **Step 4: Commit**

```bash
git add lib/db/schema.ts lib/db/index.ts drizzle.config.ts
git commit -m "feat: add Drizzle ORM schema and client for Postgres"
```

---

### Task 3: Auth 层 — Better Auth 服务端 + 客户端

**Files:**
- Create: `lib/auth/index.ts`
- Create: `lib/auth/client.ts`
- Create: `app/api/auth/[...all]/route.ts`

- [ ] **Step 1: 创建 lib/auth/index.ts**

```typescript
// lib/auth/index.ts
// Better Auth 服务端实例
// 配置 drizzleAdapter + email/password provider

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, schema } from '@/lib/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
});
```

- [ ] **Step 2: 创建 lib/auth/client.ts**

```typescript
// lib/auth/client.ts
// Better Auth 浏览器客户端

import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient();
```

- [ ] **Step 3: 创建 app/api/auth/[...all]/route.ts — Better Auth API 路由处理器**

```typescript
// app/api/auth/[...all]/route.ts
// Better Auth API 路由处理器 — 处理所有 Auth 请求

import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Step 4: Commit**

```bash
git add lib/auth/index.ts lib/auth/client.ts app/api/auth/
git commit -m "feat: add Better Auth server instance, browser client, and API route handler"
```

---

### Task 4: 环境变量更新

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: 更新 .env.local.example**

```bash
# Supabase — 移除
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# DeepSeek — 保留
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# App — 保留
NEXT_PUBLIC_APP_URL=http://localhost:3000

# PostgreSQL — 新增
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lunara

# Better Auth — 新增
BETTER_AUTH_SECRET=better-auth-secret-change-me
BETTER_AUTH_URL=http://localhost:3000
```

改为：

```bash
# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lunara

# Better Auth
BETTER_AUTH_SECRET=better-auth-secret-change-me
BETTER_AUTH_URL=http://localhost:3000

# DeepSeek
DEEPSEEK_API_KEY=sk-your-deepseek-key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Commit**

```bash
git add .env.local.example
git commit -m "chore: update env template — remove supabase keys, add DATABASE_URL and BETTER_AUTH vars"
```

---

### Task 5: 中间件重写

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: 重写 middleware.ts — 仅保留 next-intl 路由**

当前 `middleware.ts` 引用了 `updateSession` (Supabase)，重写为纯 next-intl 中间件：

```typescript
// middleware.ts
// 根级中间件 — 仅处理 next-intl 国际化路由
// Auth session 管理由 Better Auth 自动处理（cookie-based）

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export function middleware(request: Request) {
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "refactor: simplify middleware to next-intl only, remove supabase session refresh"
```

---

### Task 6: API 路由改造 — Auth 校验 + 数据库查询

**Files:**
- Modify: `app/api/chat/route.ts`
- Modify: `app/api/chat/switch/route.ts`
- Modify: `app/api/conversations/route.ts`
- Modify: `app/api/conversations/[id]/route.ts`
- Modify: `app/api/conversations/[id]/title/route.ts`

- [ ] **Step 1: 改造 app/api/conversations/route.ts（结构最简单，先改）**

把 `createServerSupabase` + `supabase.auth.getUser()` 换成 Better Auth session，把 `supabase.from()` 查询换成 Drizzle：

```typescript
// /api/conversations — 对话列表 CRUD

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import type { ExpertId, Language } from '@/lib/prompts/experts';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversations = await db
    .select({
      id: schema.conversations.id,
      expert: schema.conversations.expert,
      title: schema.conversations.title,
      language: schema.conversations.language,
      updatedAt: schema.conversations.updatedAt,
      createdAt: schema.conversations.createdAt,
    })
    .from(schema.conversations)
    .where(eq(schema.conversations.userId, session.user.id))
    .orderBy(desc(schema.conversations.updatedAt));

  return Response.json({ conversations });
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { expert?: string; language?: string } = {};
  try {
    body = await request.json();
  } catch {
    // 使用默认值
  }

  const validExperts: ExpertId[] = ['evan', 'liam', 'noah', 'adrian'];
  const expert = validExperts.includes(body.expert as ExpertId) ? body.expert as ExpertId : 'liam';

  const validLanguages: Language[] = ['en', 'zh'];
  const language = validLanguages.includes(body.language as Language) ? body.language as Language : 'en';

  const [conversation] = await db
    .insert(schema.conversations)
    .values({
      userId: session.user.id,
      expert,
      language,
      title: 'New Conversation',
    })
    .returning({
      id: schema.conversations.id,
      expert: schema.conversations.expert,
      title: schema.conversations.title,
      language: schema.conversations.language,
      updatedAt: schema.conversations.updatedAt,
      createdAt: schema.conversations.createdAt,
    });

  if (!conversation) {
    return Response.json({ error: 'Failed to create conversation' }, { status: 500 });
  }

  return Response.json({ conversation }, { status: 201 });
}
```

- [ ] **Step 2: 改造 app/api/conversations/[id]/route.ts**

```typescript
// /api/conversations/[id] — 单个对话操作

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [conversation] = await db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.id, id));

  if (!conversation) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
  }
  if (conversation.userId !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const messages = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, id))
    .orderBy(asc(schema.messages.createdAt));

  return Response.json({ conversation, messages });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const [conversation] = await db
    .select({ id: schema.conversations.id, userId: schema.conversations.userId })
    .from(schema.conversations)
    .where(eq(schema.conversations.id, id));

  if (!conversation) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
  }
  if (conversation.userId !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.delete(schema.conversations).where(eq(schema.conversations.id, id));

  return Response.json({ success: true });
}
```

- [ ] **Step 3: 改造 app/api/conversations/[id]/title/route.ts**

```typescript
// PATCH /api/conversations/[id]/title

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: { title?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    return Response.json({ error: 'Title is required' }, { status: 400 });
  }

  const [conversation] = await db
    .select({ id: schema.conversations.id, userId: schema.conversations.userId })
    .from(schema.conversations)
    .where(eq(schema.conversations.id, id));

  if (!conversation) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
  }
  if (conversation.userId !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [updated] = await db
    .update(schema.conversations)
    .set({ title: body.title.trim(), updatedAt: new Date() })
    .where(eq(schema.conversations.id, id))
    .returning();

  return Response.json({ conversation: updated });
}
```

- [ ] **Step 4: 改造 app/api/chat/route.ts**

```typescript
// POST /api/chat — SSE 流式对话 API

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import { createDeepSeekClient } from '@/lib/deepseek/client';
import { getExpertPrompt } from '@/lib/prompts/experts';
import type { ExpertId, Language } from '@/lib/prompts/experts';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!checkRateLimit(session.user.id)) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  let body: { conversation_id?: string; expert?: string; message?: string; language?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { conversation_id, expert, message, language } = body;

  const validExperts: ExpertId[] = ['evan', 'liam', 'noah', 'adrian'];
  if (!expert || !validExperts.includes(expert as ExpertId)) {
    return Response.json({ error: 'Invalid expert' }, { status: 400 });
  }

  const validLanguages: Language[] = ['en', 'zh'];
  if (!language || !validLanguages.includes(language as Language)) {
    return Response.json({ error: 'Invalid language' }, { status: 400 });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return Response.json({ error: 'Message is required' }, { status: 400 });
  }

  let conversationId = conversation_id;

  if (!conversationId) {
    const autoTitle = message.length > 50 ? message.slice(0, 50) + '...' : message;
    const [newConv] = await db
      .insert(schema.conversations)
      .values({
        userId: session.user.id,
        expert: expert as ExpertId,
        language: language as Language,
        title: autoTitle,
      })
      .returning({ id: schema.conversations.id });

    if (!newConv) {
      return Response.json({ error: 'Failed to create conversation' }, { status: 500 });
    }
    conversationId = newConv.id;
  } else {
    const [existingConv] = await db
      .select({ id: schema.conversations.id, userId: schema.conversations.userId })
      .from(schema.conversations)
      .where(eq(schema.conversations.id, conversationId));

    if (!existingConv) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 });
    }
    if (existingConv.userId !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  await db.insert(schema.messages).values({
    conversationId,
    role: 'user',
    content: message,
  });

  const history = await db
    .select({ role: schema.messages.role, content: schema.messages.content })
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .orderBy(asc(schema.messages.createdAt))
    .limit(20);

  const systemPrompt = getExpertPrompt(expert as ExpertId, language as Language);
  const chatMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  const deepseek = createDeepSeekClient();
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      let fullContent = '';
      try {
        const stream = await deepseek.chat.completions.create({
          model: 'deepseek-chat',
          messages: chatMessages,
          max_tokens: 1024,
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

        if (fullContent) {
          await db.insert(schema.messages).values({
            conversationId,
            role: 'assistant',
            content: fullContent,
          });
        }

        await db
          .update(schema.conversations)
          .set({ updatedAt: new Date() })
          .where(eq(schema.conversations.id, conversationId));

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        console.error('Stream error:', err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'AI stream generation failed' })}\n\n`));
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
```

- [ ] **Step 5: 改造 app/api/chat/switch/route.ts**

```typescript
// POST /api/chat/switch — 专家切换 API

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import { count as drizzleCount } from 'drizzle-orm';
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

  const messagesCount = await db
    .select({ count: drizzleCount() })
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversation_id));

  const expertId = new_expert as ExpertId;
  const lang = language as Language;
  let transitionMessage: string;

  if (!messagesCount[0]?.count || messagesCount[0].count === 0) {
    transitionMessage = getWelcomeMessage(expertId, lang);
  } else {
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

    try {
      const deepseek = createDeepSeekClient();
      const response = await deepseek.chat.completions.create({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: switchPrompt }],
        max_tokens: 512,
        temperature: 0.8,
        stream: false,
      });
      transitionMessage = response.choices[0]?.message?.content || getWelcomeMessage(expertId, lang);
    } catch (err) {
      console.error('DeepSeek switch prompt failed:', err);
      transitionMessage = getWelcomeMessage(expertId, lang);
    }
  }

  await db
    .update(schema.conversations)
    .set({ expert: expertId, updatedAt: new Date() })
    .where(eq(schema.conversations.id, conversation_id));

  await db.insert(schema.messages).values({
    conversationId: conversation_id,
    role: 'assistant',
    content: transitionMessage,
  });

  return Response.json({ content: transitionMessage, expert: new_expert });
}
```

- [ ] **Step 6: Commit (所有 5 个 API 文件)**

```bash
git add app/api/chat/route.ts app/api/chat/switch/route.ts app/api/conversations/route.ts app/api/conversations/\[id\]/route.ts app/api/conversations/\[id\]/title/route.ts
git commit -m "refactor: replace supabase auth/query with Better Auth + Drizzle in all API routes"
```

---

### Task 7: Auth UI — 登录/注册表单改造

**Files:**
- Modify: `components/auth/AuthForm.tsx`
- Modify: `app/[lang]/auth/login/page.tsx`
- Delete: `app/[lang]/auth/callback/route.ts`

- [ ] **Step 1: 重写 components/auth/AuthForm.tsx**

```typescript
// components/auth/AuthForm.tsx — 登录/注册表单组件

'use client';

import { useState, FormEvent } from 'react';
import { authClient } from '@/lib/auth/client';

export function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await authClient.signUp.email({ email, password });
        if (error) {
          setMessage({ type: 'error', text: error.message || 'Sign up failed' });
        } else {
          setMessage({ type: 'success', text: 'Account created! You can now sign in.' });
        }
      } else {
        const { error } = await authClient.signIn.email({ email, password });
        if (error) {
          setMessage({ type: 'error', text: error.message || 'Sign in failed' });
        } else {
          window.location.href = '/en/chat/liam';
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[24px] bg-white p-8 shadow-soft">
        <h1 className="text-center text-2xl font-semibold text-text-primary">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="mt-2 text-center text-sm text-text-secondary">
          {isSignUp ? 'Start your journey with Lunara' : 'Sign in to continue your conversations'}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-primary">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-[18px] border border-gray-200 bg-[#FAF7F2] px-5 py-3 text-sm text-text-primary placeholder-gray-400 outline-none transition-all focus:border-[#FF7A59]/40 focus:ring-2 focus:ring-[#FF7A59]/10"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-primary">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              minLength={6}
              className="w-full rounded-[18px] border border-gray-200 bg-[#FAF7F2] px-5 py-3 text-sm text-text-primary placeholder-gray-400 outline-none transition-all focus:border-[#FF7A59]/40 focus:ring-2 focus:ring-[#FF7A59]/10"
            />
          </div>

          {message && (
            <div className={`rounded-[12px] px-4 py-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[16px] bg-[#FF7A59] py-3 text-sm font-medium text-white transition-all hover:bg-[#FF7A59]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
            className="font-medium text-[#FF7A59] hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 删除 auth callback 路由（Supabase 专用，不再需要）**

```bash
rm app/\[lang\]/auth/callback/route.ts
```

- [ ] **Step 3: 验证 login page 无需修改**

`app/[lang]/auth/login/page.tsx` 仅导入 `<AuthForm />`，无需改动。

- [ ] **Step 4: Commit**

```bash
git add components/auth/AuthForm.tsx && git rm app/\[lang\]/auth/callback/route.ts
git commit -m "refactor: replace supabase auth with Better Auth in AuthForm, remove callback route"
```

---

### Task 8: Chat Layout Auth 守卫

**Files:**
- Modify: `app/[lang]/chat/layout.tsx`

- [ ] **Step 1: 重写 auth 守卫 — 从 Supabase getUser 改为 Better Auth getSession**

```typescript
// /[lang]/chat/layout.tsx — 聊天路由 Auth 守卫布局

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default async function ChatLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    const { lang } = await params;
    redirect(`/${lang}/auth/login`);
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\[lang\]/chat/layout.tsx
git commit -m "refactor: use Better Auth session check in chat layout auth guard"
```

---

### Task 9: 脚本更新

**Files:**
- Modify: `scripts/dev.sh`
- Modify: `scripts/start.sh`

- [ ] **Step 1: 更新 scripts/dev.sh — 增加 DB 检查和迁移**

```bash
#!/bin/bash
set -e
echo "=== Starting Lunara Dev Server ==="
cd "$(dirname "$0")/.."

# 检查 .env.local
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "Created .env.local from template — please fill in your keys."
  exit 1
fi

# 检查 PostgreSQL 连接
source .env.local 2>/dev/null || true
if [ -n "$DATABASE_URL" ]; then
  echo "Checking PostgreSQL connection..."
  npx drizzle-kit check 2>/dev/null || echo "⚠️  Could not connect to PostgreSQL. Please check DATABASE_URL."
else
  echo "⚠️  DATABASE_URL not set. Database features won't work."
fi

# 运行数据库迁移
echo "Running database migrations..."
npx drizzle-kit migrate

# 启动开发服务器
npx next dev
```

- [ ] **Step 2: 更新 scripts/start.sh — 同上逻辑**

```bash
#!/bin/bash
set -e
echo "=== Starting Lunara Production ==="
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "Creating .env.local from template..."
  cp .env.local.example .env.local
  echo "⚠️  Please edit .env.local with your keys before proceeding."
  exit 1
fi

echo "Installing dependencies..."
npm install --silent

echo "Running database migrations..."
npx drizzle-kit migrate

echo "Building application..."
npm run build

echo "Starting production server on port 3000..."
npx next start -p 3000 &
echo $! > /tmp/lunara.pid
echo "Lunara started (PID: $(cat /tmp/lunara.pid))"
```

- [ ] **Step 3: Commit**

```bash
git add scripts/dev.sh scripts/start.sh
git commit -m "chore: update scripts — add drizzle migrate step, remove supabase references"
```

---

### Task 10: 清理旧文件

**Files:**
- Delete: `supabase/` (整个目录)
- Delete: `lib/supabase/` (整个目录)

- [ ] **Step 1: 删除旧目录**

```bash
rm -rf supabase/
rm -rf lib/supabase/
```

- [ ] **Step 2: Commit**

```bash
git rm -r supabase/ lib/supabase/
git commit -m "chore: remove supabase directory, SQL migrations, and supabase client lib"
```

---

### Task 11: 类型检查与构建验证

**Files:**
- (验证，不修改文件)

- [ ] **Step 1: 类型检查**

```bash
npx tsc --noEmit
```
预期：无类型错误。如有错误，逐项修复。

- [ ] **Step 2: 构建检查**

```bash
npm run build
```
预期：构建成功。如有错误，根据错误信息修复。

- [ ] **Step 3: 运行现有测试**

```bash
npm test
```
预期：prompts 测试和 expert-validation 测试通过（不依赖 Supabase）。

- [ ] **Step 4: Commit（如有修复）**

```bash
git add -A
git commit -m "chore: final type and build fixes for supabase removal"
```

---

### 变更汇总

| 任务 | 新建 | 修改 | 删除 |
|------|------|------|------|
| Task 1: 依赖 | — | `package.json` | — |
| Task 2: DB 层 | `lib/db/schema.ts` `lib/db/index.ts` `drizzle.config.ts` | — | — |
| Task 3: Auth 层 | `lib/auth/index.ts` `lib/auth/client.ts` | — | — |
| Task 4: 环境变量 | — | `.env.local.example` | — |
| Task 5: 中间件 | — | `middleware.ts` | — |
| Task 6: API 路由 | — | 5 个 route.ts 文件 | — |
| Task 7: Auth UI | — | `AuthForm.tsx` | `callback/route.ts` |
| Task 8: Auth Guard | — | `chat/layout.tsx` | — |
| Task 9: 脚本 | — | `dev.sh` `start.sh` | — |
| Task 10: 清理 | — | — | `supabase/` `lib/supabase/` |
| Task 11: 验证 | — | — | — |

**总计约 18 个文件变更，UI 组件（落地页、聊天 UI、i18n、DeepSeek、提示词）完全不动。**

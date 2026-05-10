# Lunara — 去 Supabase 化设计文档

> 创建日期：2026-05-10 | 目标：用轻量方案替换 Supabase（Auth + 数据库）

---

## 一、动机

Supabase 承担了三个角色：Auth、PostgreSQL 数据库、客户端 SDK。本地已有 PostgreSQL 16 运行中，采用"自己掌控 + 轻量"路线替换。

---

## 二、替换矩阵

| 层 | 原来 | 替换为 | 原因 |
|----|------|--------|------|
| Auth | Supabase Auth (邮箱密码 + JWT + SSR) | Better Auth | TypeScript 原生，轻量，自带 Next.js 集成 |
| 数据库 | Supabase PostgreSQL | 本地 PostgreSQL 16（已有，端口 5432） | 零外部依赖 |
| ORM / 查询 | supabase-js 客户端 | Drizzle ORM | TypeScript-first，接近原生 SQL |
| 迁移 | Supabase CLI (`supabase db push`) | Drizzle Kit | 代码即 Schema，版本化迁移 |

**移除的依赖：** `@supabase/supabase-js`、`@supabase/ssr`

**新增的依赖：** `better-auth`、`better-auth/next-js`、`drizzle-orm`、`drizzle-kit`、`@libsql/pg`

**完全不变：** 落地页 UI、聊天 UI 组件、DeepSeek 客户端、专家提示词、i18n 翻译、TailwindCSS 配置、Framer Motion 动效

---

## 三、数据库 Schema

### 目录结构

```
lib/db/
├── schema.ts   ← Drizzle 表定义
└── index.ts    ← drizzle client 实例
drizzle.config.ts ← Drizzle Kit 配置
```

### 表结构

与原 Supabase schema 功能等价，变化点：

- **profiles** — 去掉 `REFERENCES auth.users(id)`，Better Auth 维护自己的 `user` 表，profiles 的 `user_id` 作为普通外键关联
- **conversations** — `CHECK` 约束改用 Drizzle `pgEnum`
- **messages** — 不变
- **RLS 策略** — 删除（Supabase 特有，本地 PG 不需要；数据隔离在 API 层通过 session.user.id 保证）
- **触发器 `handle_new_user()`** — 删除，用户创建时的 profile 初始化在 API 层处理

### 迁移

```bash
npx drizzle-kit generate   # 生成迁移 SQL 到 lib/db/migrations/
npx drizzle-kit migrate    # 执行迁移
```

---

## 四、Auth 层

### 目录结构

```
lib/auth/
├── index.ts    ← auth 实例（betterAuth + drizzleAdapter + email/password provider）
└── client.ts   ← 浏览器客户端（createAuthClient）
```

### 各文件改动清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `lib/auth/index.ts` | 新建 | 服务端 auth 实例，配置 drizzleAdapter 和 email/password provider |
| `lib/auth/client.ts` | 新建 | 浏览器端 `createAuthClient()` |
| `lib/supabase/client.ts` | 删除 | — |
| `lib/supabase/server.ts` | 删除 | — |
| `lib/supabase/middleware.ts` | 删除 | — |
| `middleware.ts` | 重写 | Better Auth middleware + next-intl middleware 组合 |
| `components/auth/AuthForm.tsx` | 修改 | `supabase.auth.signInWithPassword/signUp` → `authClient.signIn.email/signUp.email` |
| `app/[lang]/auth/login/page.tsx` | 修改 | 适配新的 AuthForm |
| `app/[lang]/auth/callback/route.ts` | 删除 | Supabase OAuth 回调专用，不再需要 |
| `app/[lang]/chat/layout.tsx` | 修改 | `getUser()` 改为 Better Auth session 检查 |
| `app/api/chat/route.ts` | 修改 | auth 获取 → `auth.api.getSession()`，DB 查询 → Drizzle |
| `app/api/chat/switch/route.ts` | 修改 | 同上 |
| `app/api/conversations/route.ts` | 修改 | 同上 |
| `app/api/conversations/[id]/route.ts` | 修改 | 同上 |
| `app/api/conversations/[id]/title/route.ts` | 修改 | 同上 |

---

## 五、数据访问层

所有 API 路由中的 `supabase.from('table').select/insert/update/delete` 改为 Drizzle 查询：

```ts
// 改前 (supabase-js)
const { data } = await supabase.from('conversations').select('*').eq('user_id', user.id);

// 改后 (Drizzle)
const data = await db.select().from(conversationsTable).where(eq(conversationsTable.userId, session.user.id));
```

客户端组件（ChatSidebar）中的 supabase 直接查询改为通过 API fetch。

---

## 六、环境变量

### 删除
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 新增
- `DATABASE_URL` — PG 连接字符串
- `BETTER_AUTH_SECRET` — 加密密钥
- `BETTER_AUTH_URL` — 应用 URL

### 保留
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
- `NEXT_PUBLIC_APP_URL`

---

## 七、脚本

- `scripts/dev.sh` — 增加 drizzle migrate 步骤 + PG 连接检查
- `scripts/start.sh` — 同上
- `scripts/deploy.sh` — 不变

---

## 八、变更汇总

| 操作 | 数量 |
|------|------|
| 删除目录 | 2（`supabase/` `lib/supabase/`） |
| 新建目录 | 2（`lib/db/` `lib/auth/`） |
| 新建文件 | 5 |
| 重写文件 | 8 |
| 修改文件 | 4 |
| 删除文件 | 2 |
| 不变文件 | 20+（所有 UI 组件、i18n、DeepSeek、提示词、样式配置） |

---

## 九、测试

### 保留
- `__tests__/prompts.test.ts`
- `__tests__/expert-validation.test.ts`
- `vitest.config.ts`

### 后续新增（本次不包含）
- Auth 流程测试
- API 端点测试
- Drizzle schema 验证

---

## 十、风险与注意事项

1. **Better Auth 兼容性** — 若 Better Auth 的 Next.js 中间件与 next-intl 中间件组合有问题，改为在 API 层手动验证 session（回退方案简单）
2. **Vercel 部署** — 本地 PG 在 Vercel serverless 中不可达，部署时需将 `DATABASE_URL` 指向 Vercel Marketplace 的 PostgreSQL（如 Neon）或通过公网连接本机
3. **数据迁移** — 若已有 Supabase 生产数据，需编写导出脚本（当前 MVP 阶段无此问题）

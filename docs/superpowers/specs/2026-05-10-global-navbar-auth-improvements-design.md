# 全局导航栏与认证完善 — 设计规范

**日期**: 2026-05-10  
**状态**: 已确认  
**关联**: Lunara 爱情关系指导 MVP

---

## 1. 概述

### 目标

1. 添加全局导航栏 — 顶部固定，AI 对话页最小化显示
2. 完善认证流程 — 导航栏集成登录/注册/头像下拉（退出登录）
3. 落地页文案调整 — 聚焦爱情关系指导（建立/维护/促进/拯救）
4. 生产数据库连接 — Vercel 通过 `db_lunara.qfxblacker.top` 隧道连接本地 PostgreSQL

### 约束

- 遵循现有项目结构（Next.js 16 App Router + Better Auth + next-intl）
- 中文/英文双语同步更新
- 不使用 Supabase（已移除），仅 Better Auth + Drizzle + PG

---

## 2. 导航栏架构

### 组件结构

```
components/common/Navbar.tsx        — 服务端组件：获取 session，渲染 NavbarClient
components/common/NavbarClient.tsx  — 客户端组件：路径判断、下拉交互、登出操作
```

### 数据流

```
[lang]/layout.tsx
  └─ Navbar (服务端)
       ├─ auth.api.getSession(headers) → session 数据
       └─ NavbarClient (客户端)
            ├─ usePathname() → 判断 /chat/* → 切换模式
            └─ session.user → 决定 [登录按钮] 或 [头像下拉]
```

### 两种渲染模式

| 模式 | 触发条件 | 显示内容 |
|------|---------|---------|
| 完整模式 | 非 `/chat/*` 路径 | Logo + 首页 + 开始对话 + 登录/注册（或头像+下拉） |
| 最小模式 | `/chat/*` 路径 | Logo + 头像下拉 |

### 头像下拉菜单

- 用户名称/邮箱
- 分隔线
- 退出登录（调用 `authClient.signOut()`，跳转回当前语言首页）

---

## 3. 布局集成

### 改动点

| 文件 | 改动 |
|------|------|
| `app/[lang]/layout.tsx` | 在 `NextIntlClientProvider` 内引入 `<Navbar>`，包裹 children |
| `app/[lang]/chat/layout.tsx` | 保留 auth guard，移除涉及导航栏的逻辑（无需重复） |

### 集成示意

```
RootLayout (html/body)
  └─ LangLayout ([lang])
       ├─ Navbar ← 新增，全局
       └─ NextIntlClientProvider
            └─ {children}
                 ├─ landing page
                 ├─ auth/login page
                 └─ ChatLayout (auth guard + minimal navbar)
                      └─ chat page
```

---

## 4. 认证流程

### 当前状态

- `chat/layout.tsx` 已有 auth guard：未登录 → 重定向 `/auth/login` ✅
- `AuthForm` 支持登录/注册切换 ✅
- 登录成功跳转硬编码了 `en` ❌ → 修复为当前语言路由

### 改动点

1. **AuthForm 语言修复**：`window.location.href = '/en/chat/liam'` → 使用路由参数中的 `lang`
2. **导航栏认证区域**：
   - 未登录：显示「登录」+「开始使用」按钮 → 链接 `/[lang]/auth/login`
   - 已登录：显示头像按钮 + 下拉菜单（退出登录）
3. **Hero CTA**：链接不变（`/[lang]/chat/liam`），auth guard 自动拦截未登录用户

---

## 5. 落地页文案

### Hero 板块

- badge: "AI 情感引导" → "AI 爱情关系指导"（zh）/ "AI Relationship Guidance"（en）
- subtitle: 重写，聚焦爱情关系四大方向（建立/维护/促进/拯救）
- ctaSubtext: **删除** "免费开始，无需注册" / "Free to start. No registration needed."

### Trust 板块

- 标题: "从建立到拯救，全程陪伴你的爱情关系"
- 四个维度对应四位专家：
  1. 建立 — 安全感、信任、健康沟通模式
  2. 维护 — 日常情感润滑、温度与深度连接
  3. 促进 — 吸引力动态、关系升温
  4. 拯救 — 信任崩塌、冷战僵持、分手危机

### FAQ 板块

- 删除第 4 条 "Lunara 是免费的吗？/ Is Lunara free?"
- 其余条目："情感引导" → "爱情关系指导"

---

## 6. 数据库配置

### 本地开发

`.env.local` 保持不变：`DATABASE_URL=postgresql://...@localhost:5432/lunara`

### 生产部署

Vercel 环境变量设置：`DATABASE_URL=postgresql://postgres:xxx@db_lunara.qfxblacker.top:5432/lunara`

本地通过 Cloudflare Tunnel / frp 等隧道工具将 `db_lunara.qfxblacker.top:5432` 转发到 `localhost:5432`。

> ⚠️ 隧道稳定性影响线上服务。本地机器关机或断网将导致 Vercel 函数数据库连接失败。

---

## 7. i18n 新增键

### nav 命名空间扩展

```json
{
  "nav": {
    "logout": "退出登录 / Logout",
    "startChat": "开始对话 / Start Chat"
  }
}
```

### 其他命名空间

- `hero`: badge / title / subtitle 修改，ctaSubtext 删除
- `trust`: title / items 重写
- `faq`: 删除 items[3]（第4条），其余微调

---

## 8. 文件改动清单

| # | 文件 | 操作 |
|---|------|------|
| 1 | `components/common/Navbar.tsx` | 新建 — 服务端导航栏 |
| 2 | `components/common/NavbarClient.tsx` | 新建 — 客户端导航栏交互 |
| 3 | `app/[lang]/layout.tsx` | 修改 — 集成 Navbar |
| 4 | `components/auth/AuthForm.tsx` | 修改 — 登录跳转语言修复 |
| 5 | `components/landing/Hero.tsx` | 修改 — 移除 ctaSubtext 行 |
| 6 | `messages/zh.json` | 修改 — hero/trust/faq/nav |
| 7 | `messages/en.json` | 修改 — hero/trust/faq/nav |
| 8 | `.env.local.example` | 修改 — 更新模板说明 |

**不修改的文件：**
- `app/[lang]/chat/layout.tsx` — auth guard 保持不变
- `middleware.ts` — 保持不变
- `lib/auth/index.ts` — 保持不变
- 数据库 schema — 保持不变

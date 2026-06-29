# Design Spec: HeartLab → QFriendly 全栈改名

**日期**: 2026-06-29
**状态**: 已批准
**类型**: 项目重命名

---

## 1. 目标

将项目品牌名从 "HeartLab" 全面更名为 "QFriendly"，涵盖基础设施、代码、配置、i18n 文案、文档所有层级。

## 2. 决策汇总

| 维度 | 当前值 | 目标值 |
|---|---|---|
| 项目目录 | `heartlab/` | `qfriendly/` |
| 数据库 | `heartlab` | `qfriendly` (ALTER DATABASE RENAME) |
| 主域名 | `heartlab.qfxblacker.top` | `qfriendly.qfxblacker.top` |
| 数据库域名 | `db_heartlab.qfxblacker.top` | `db_qfriendly.qfxblacker.top` |
| GitHub 仓库 | `blacker135/heartlab.git` | `blacker135/qfriendly.git` (GitHub Settings 重命名) |
| Vercel 项目 | `star1-relation` | `qfriendly` (Vercel Dashboard 重命名) |
| 管理员邮箱 | `admin_blacker@heartlab.quan` | `admin_blacker@qfriendly.quan` |
| 支持邮箱 | `support@heartlab.ai` | `support@qfriendly.ai` |

## 3. 执行阶段

### Phase 1: 基础设施准备 (先做，不影响运行)

1. **GitHub 仓库重命名**: 在 GitHub Settings → Rename: `heartlab` → `qfriendly`
2. **Vercel 项目重命名**: 在 Vercel Dashboard → Settings → General → Rename: `star1-relation` → `qfriendly`
3. **创建新域名 DNS 记录**: 添加 `qfriendly.qfxblacker.top` A 记录指向 Vercel

### Phase 2: 数据库改名 (短暂中断)

```sql
-- 先断开所有活跃连接
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'heartlab' AND pid <> pg_backend_pid();

-- 重命名数据库
ALTER DATABASE heartlab RENAME TO qfriendly;
```

### Phase 3: 代码 + 文件系统改名

#### 3a. 目录重命名
```
heartlab/ → qfriendly/
```

#### 3b~3d. 文件改动清单 (14 个文件)

**配置文件 (4):**

| 文件 | 改动 |
|---|---|
| `package.json` | `"name": "heartlab"` → `"name": "qfriendly"` |
| `drizzle.config.ts` | 无需改动（读 DATABASE_URL 环境变量） |
| `.env.local` | DATABASE_URL 中 `heartlab` → `qfriendly` |
| `.env.local.example` | DATABASE_URL 和注释中的域名更新 |

**代码文件 (5):**

| 文件 | 改动 |
|---|---|
| `app/layout.tsx` | metadata: `HeartLab` → `QFriendly` |
| `lib/db/schema.ts` | 注释中 `HeartLab` → `QFriendly` (3处) |
| `components/auth/AuthForm.tsx` | 文案中 `HeartLab` → `QFriendly` |
| `scripts/create-admin.ts` | 邮箱域名 + 脚本标题 |
| `scripts/activate-paypal-plans.ts` | 脚本标题 |

**i18n 文案 (2):**

| 文件 | 改动数量 |
|---|---|
| `messages/en.json` | ~12 处: siteName, brand, title, copyright, terms/privacy, support email |
| `messages/zh.json` | ~12 处: 镜像 en.json 的中文版 |

**根目录文档 (1):**

| 文件 | 改动 |
|---|---|
| `CLAUDE.md` | 所有 heartlab 路径/域名/数据库名/GitHub 地址/Vercel 说明 (约 8 处) |

#### ⚠️ 明确不改
- `docs/superpowers/plans/` — 历史计划文档，保持原样
- `docs/superpowers/specs/` (旧) — 历史规格文档，保持原样
- `.vercel/` — Vercel CLI 自动管理

### Phase 4: 同步 & 验证

#### 4a. Vercel 环境变量更新

| 变量名 | 新值 |
|---|---|
| `BETTER_AUTH_URL` | `https://qfriendly.qfxblacker.top` |
| `NEXT_PUBLIC_APP_URL` | `https://qfriendly.qfxblacker.top` |
| `NEXT_PUBLIC_AUTH_URL` | `https://qfriendly.qfxblacker.top/api/auth` |
| `DATABASE_URL` | `postgresql://...@db_qfriendly.../qfriendly` |

更新范围: Production + Preview 两个环境。

同步流程:
1. `vercel env add` 逐个更新
2. `vercel env pull production` → `.env.vercel.prod`
3. `vercel env pull preview` → `.env.vercel.dev`
4. 对比 `.env.local` 确保一致

#### 4b. Git 远程地址更新 & 推送

```bash
git remote set-url origin git@github.com:blacker135/qfriendly.git
git add -A
git commit -m "refactor: HeartLab → QFriendly 全栈品牌改名"
git push origin master
```

推送后 Vercel 自动从 GitHub 拉取并部署。

#### 4c. 验证清单

- [ ] 新域名 qfriendly.qfxblacker.top 可正常访问
- [ ] 登录/注册功能正常 (Better Auth)
- [ ] AI 聊天功能正常 (SSE 流式调用 DeepSeek)
- [ ] PayPal 订阅购买/激活流程正常
- [ ] 管理后台可正常登录和使用
- [ ] 国际化 (en/zh) 品牌文案全部替换
- [ ] 数据库连接正常 (qfriendly 库)
- [ ] Vercel 环境变量与 .env.local 一致
- [ ] GitHub 仓库正常推送

## 4. 风险与缓解

| 风险 | 缓解措施 |
|---|---|
| 数据库改名时连接中断 | 先断开所有连接再重命名，Vercel 部署后自动重连 |
| 域名 DNS 生效延迟 | 新旧域名并行保留，旧域名设置 301 重定向 |
| GitHub 重命名后本地 remote 失效 | Phase 4b 中执行 `git remote set-url` |
| PayPal Plan 名称含 HeartLab | Plan ID 不变，仅代码中产品名称改为 QFriendly |
| Vercel 自动部署用旧配置 | Phase 3 完成后一次性推送，保证改动原子化 |

## 5. 不改的内容

- **PayPal Plan ID**: 不需要修改，Plan 在 PayPal 侧保持原样，仅代码注释更新
- **数据库结构**: 仅改名，Schema/迁移/数据全部保留
- **DeepSeek API 配置**: 不涉及品牌名，无需改动
- **npm 包依赖**: 不变
- **Drizzle 迁移文件**: 历史迁移 SQL 保持原样

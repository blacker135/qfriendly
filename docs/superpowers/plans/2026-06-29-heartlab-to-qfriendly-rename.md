# HeartLab → QFriendly 全栈改名实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将项目品牌名从 "HeartLab" 全面更名为 "QFriendly"，涵盖基础设施、代码、配置、i18n、文档所有层级。

**Architecture:** 按依赖顺序分 4 阶段执行：Phase 1 基础设施准备（不影响运行）→ Phase 2 数据库改名（短暂中断）→ Phase 3 代码改名（原子提交）→ Phase 4 同步验证。

**Tech Stack:** Next.js 16, PostgreSQL (Drizzle ORM), Better Auth, DeepSeek API, PayPal, Vercel, next-intl

## Global Constraints

- 沟通语言: 向用户输出一律采用中文
- GitHub 推送: SSH 方式 `git@github.com:blacker135/qfriendly.git`
- Vercel 项目: 重命名为 qfriendly
- 域名: qfriendly.qfxblacker.top / db_qfriendly.qfxblacker.top
- 新邮箱: admin_blacker@qfriendly.quan / support@qfriendly.ai
- 旧域名保留并行运行，设置 301 重定向
- PayPal Plan ID 不变，仅代码注释变更
- Drizzle 迁移历史文件不改
- npm 命令需要 sudo

---

### Task 1: Phase 1 — GitHub 仓库重命名

**Files:**
- 无需本地文件修改（GitHub 侧操作）

**Interfaces:**
- 无

- [ ] **Step 1: 在 GitHub 上重命名仓库**

使用 GitHub MCP 工具或直接在 github.com 操作：
Settings → General → Repository name: `heartlab` → `qfriendly`
Rename 后 GitHub 自动重定向旧 URL。

- [ ] **Step 2: 验证旧 URL 自动重定向**

```bash
git ls-remote git@github.com:blacker135/heartlab.git 2>&1 | head -3
```

Expected: 正常返回（GitHub 静默重定向到新仓库）

- [ ] **Step 3: 确认新仓库 URL 可访问**

```bash
git ls-remote git@github.com:blacker135/qfriendly.git 2>&1 | head -3
```

Expected: 成功返回 refs

---

### Task 2: Phase 1 — DNS 记录 & Vercel 域名绑定

**Files:**
- 无需本地文件修改（DNS/Vercel 操作）

**Interfaces:**
- 无

**前置说明:**
- DNS 管理在域名注册商处操作（qfxblacker.top 的 DNS 控制台）
- 添加记录: `qfriendly.qfxblacker.top` → A 记录 → Vercel 的任意播 IP (76.76.21.21)
- 添加记录: `db_qfriendly.qfxblacker.top` → A 记录 → 指向 PostgreSQL 服务器 IP

- [ ] **Step 1: 在 DNS 控制台添加 qfriendly 域名记录**

在 qfxblacker.top 的 DNS 管理中添加:
```
类型: A, 名称: qfriendly, 值: 76.76.21.21, TTL: 600
```

- [ ] **Step 2: 在 DNS 控制台添加 db_qfriendly 域名记录**

```
类型: A, 名称: db_qfriendly, 值: <PostgreSQL 服务器 IP>, TTL: 600
```

- [ ] **Step 3: 在 Vercel Dashboard 添加新域名**

Dashboard → qfriendly → Settings → Domains → Add: `qfriendly.qfxblacker.top`

Expected: Vercel 验证 DNS 配置并自动签发 SSL 证书

- [ ] **Step 4: 为旧域名设置 301 重定向**

Dashboard → qfriendly → Settings → Domains → 选中 `heartlab.qfxblacker.top` → Redirect to `qfriendly.qfxblacker.top` (301 permanent)

---

### Task 3: Phase 1 — Vercel 项目重命名

**Files:**
- 无需本地文件修改（Vercel Dashboard 操作）

**Interfaces:**
- 无

- [ ] **Step 1: 在 Vercel Dashboard 上重命名项目**

Dashboard → star1-relation → Settings → General → Project Name: `star1-relation` → `qfriendly`
点击 Save。

- [ ] **Step 2: 验证 Vercel 项目列表**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/heartlab && vercel list 2>&1 | head -10
```

Expected: 列表中出现 qfriendly 项目

---

### Task 4: Phase 2 — PostgreSQL 数据库重命名

**Files:**
- 无需本地文件修改（数据库操作）

**Interfaces:**
- 无

- [ ] **Step 1: 检查当前数据库活跃连接**

```bash
sudo -u postgres psql -d heartlab -c "SELECT pid, usename, application_name, state FROM pg_stat_activity WHERE datname = 'heartlab';"
```

Expected: 列出当前连接（可能为空或仅有当前连接）

- [ ] **Step 2: 断开所有活跃连接**

```bash
sudo -u postgres psql -d heartlab -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'heartlab' AND pid <> pg_backend_pid();"
```

Expected: 返回已终止的 pid 列表

- [ ] **Step 3: 重命名数据库**

```bash
sudo -u postgres psql -d postgres -c "ALTER DATABASE heartlab RENAME TO qfriendly;"
```

Expected: `ALTER DATABASE` (成功，无错误)

- [ ] **Step 4: 验证新数据库名**

```bash
sudo -u postgres psql -d postgres -c "\l" | grep qfriendly
```

Expected: 列表中出现 `qfriendly` 数据库

- [ ] **Step 5: 验证数据完整性**

```bash
sudo -u postgres psql -d qfriendly -c "SELECT count(*) FROM \"user\"; SELECT count(*) FROM conversations; SELECT count(*) FROM messages;"
```

Expected: 返回各表行数（与改名前一致）

---

### Task 5: Phase 3a — 项目目录重命名

**Files:**
- Rename: `heartlab/` → `qfriendly/`

**Interfaces:**
- 无（后续 Task 6-9 的文件路径基于新目录名 `qfriendly/`）

- [ ] **Step 1: 确认当前工作目录干净**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/heartlab && git status --short
```

Expected: 无未提交更改（除了刚提交的 spec 文档）

- [ ] **Step 2: 重命名目录**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly && mv heartlab qfriendly
```

Expected: 目录从 `heartlab/` 变为 `qfriendly/`

- [ ] **Step 3: 验证目录结构完整**

```bash
ls /home/ubuntu/project/ai/start01-qfriendly/qfriendly/package.json
```

Expected: 文件存在

---

### Task 6: Phase 3b — 配置文件更新

**Files:**
- Modify: `qfriendly/package.json`
- Modify: `qfriendly/.env.local`
- Modify: `qfriendly/.env.local.example`

**Interfaces:**
- 产出: `DATABASE_URL` 指向 `qfriendly` 数据库

- [ ] **Step 1: 更新 package.json name 字段**

Edit `qfriendly/package.json`:
```
old: "name": "heartlab",
new: "name": "qfriendly",
```

- [ ] **Step 2: 更新 .env.local DATABASE_URL**

Edit `qfriendly/.env.local` 第 11 行:
```
old: DATABASE_URL=postgresql://postgres:blacker_admin123@localhost:5432/heartlab
new: DATABASE_URL=postgresql://postgres:blacker_admin123@localhost:5432/qfriendly
```

- [ ] **Step 3: 更新 .env.local.example**

Edit `qfriendly/.env.local.example`:
- 第 10 行注释: `heartlab` → `qfriendly`
- 第 11 行注释: `heartlab.qfxblacker.top` → `qfriendly.qfxblacker.top`
- 第 13 行: `DATABASE_URL=postgresql://postgres:your_password@localhost:5432/heartlab` → `.../qfriendly`

```
old (line 10-11):
# 本地开发: postgresql://postgres:your_password@localhost:5432/heartlab
# 远程访问: postgresql://postgres:your_password@db_heartlab.qfxblacker.top:5432/heartlab?sslmode=require
new (line 10-11):
# 本地开发: postgresql://postgres:your_password@localhost:5432/qfriendly
# 远程访问: postgresql://postgres:your_password@db_qfriendly.qfxblacker.top:5432/qfriendly?sslmode=require
```

```
old (line 13):
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/heartlab
new (line 13):
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/qfriendly
```

- [ ] **Step 4: 更新 .env.local.example 域名注释**

在 .env.local.example 中搜索 `heartlab.qfxblacker.top`，全部替换为 `qfriendly.qfxblacker.top`。
在 .env.local.example 中搜索 `db_heartlab`，全部替换为 `db_qfriendly`。

涉及行：
- BETTER_AUTH_URL 注释 (line 23): `heartlab.qfxblacker.top` → `qfriendly.qfxblacker.top`
- NEXT_PUBLIC_APP_URL 注释 (line 39): `heartlab.qfxblacker.top` → `qfriendly.qfxblacker.top`
- NEXT_PUBLIC_AUTH_URL 注释 (line 46): `heartlab.qfxblacker.top` → `qfriendly.qfxblacker.top`

- [ ] **Step 5: 验证 JSON 合法性**

```bash
node -e "JSON.parse(require('fs').readFileSync('/home/ubuntu/project/ai/start01-qfriendly/qfriendly/package.json','utf8'))" && echo "OK"
```

Expected: `OK`

- [ ] **Step 6: Commit**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && git add package.json .env.local .env.local.example && git commit -m "refactor: config rename HeartLab → QFriendly"
```

---

### Task 7: Phase 3c — 代码文件品牌名更新

**Files:**
- Modify: `qfriendly/app/layout.tsx`
- Modify: `qfriendly/lib/db/schema.ts`
- Modify: `qfriendly/components/auth/AuthForm.tsx`
- Modify: `qfriendly/scripts/create-admin.ts`
- Modify: `qfriendly/scripts/activate-paypal-plans.ts`

**Interfaces:**
- 无接口变更

- [ ] **Step 1: 更新 app/layout.tsx metadata**

Edit `qfriendly/app/layout.tsx`:
```
old (lines 5-6):
  title: 'HeartLab — AI Emotional Guidance',
  description: 'AI emotional guidance for modern relationships. Talk with experts who understand.',
new (lines 5-6):
  title: 'QFriendly — AI Emotional Guidance',
  description: 'AI emotional guidance for modern relationships. Talk with experts who understand.',
```

- [ ] **Step 2: 更新 lib/db/schema.ts 注释**

Edit `qfriendly/lib/db/schema.ts`:
```
old (line 3):
// 包含 Better Auth 认证表 + HeartLab 业务表
new (line 3):
// 包含 Better Auth 认证表 + QFriendly 业务表

old (line 76):
// HeartLab 订阅表
new (line 76):
// QFriendly 订阅表

old (line 102):
// HeartLab 业务表
new (line 102):
// QFriendly 业务表
```

- [ ] **Step 3: 更新 components/auth/AuthForm.tsx**

Edit `qfriendly/components/auth/AuthForm.tsx`:
```
old (line 67):
          {isSignUp ? 'Start your journey with HeartLab' : 'Sign in to continue your conversations'}
new (line 67):
          {isSignUp ? 'Start your journey with QFriendly' : 'Sign in to continue your conversations'}
```

同时更新文件头注释:
```
old (line 1):
// components/auth/AuthForm.tsx — 登录/注册表单组件
new (line 1):
// components/auth/AuthForm.tsx — 登录/注册表单组件
```
不需要改文件名，仅改文案。

- [ ] **Step 4: 更新 scripts/create-admin.ts**

Edit `qfriendly/scripts/create-admin.ts`:
```
old (line 15):
const ADMIN_EMAIL = 'admin_blacker@heartlab.quan';
new (line 15):
const ADMIN_EMAIL = 'admin_blacker@qfriendly.quan';

old (line 73):
  console.log('=== HeartLab 管理员账号创建工具 ===\n');
new (line 73):
  console.log('=== QFriendly 管理员账号创建工具 ===\n');
```

- [ ] **Step 5: 更新 scripts/activate-paypal-plans.ts**

Edit `qfriendly/scripts/activate-paypal-plans.ts`:
```
old (line 138):
  console.log('🫀 HeartLab — PayPal Plan 激活工具\n');
new (line 138):
  console.log('💚 QFriendly — PayPal Plan 激活工具\n');
```

- [ ] **Step 6: 验证 TypeScript 编译**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && sudo npx tsc --noEmit 2>&1 | head -20
```

Expected: 无类型错误

- [ ] **Step 7: Commit**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && git add app/layout.tsx lib/db/schema.ts components/auth/AuthForm.tsx scripts/create-admin.ts scripts/activate-paypal-plans.ts && git commit -m "refactor: code files HeartLab → QFriendly brand rename"
```

---

### Task 8: Phase 3d — i18n 国际化文案更新

**Files:**
- Modify: `qfriendly/messages/en.json`
- Modify: `qfriendly/messages/zh.json`

**Interfaces:**
- 所有 UI 中的品牌名展示依赖这些文案

- [ ] **Step 1: 更新 messages/en.json — 精确替换 12 处**

文件路径: `qfriendly/messages/en.json`

逐个执行替换：

1. `"title": "HeartLab — AI Relationship Guidance"` → `"title": "QFriendly — AI Relationship Guidance"`
2. `"siteName": "HeartLab"` → `"siteName": "QFriendly"`
3. `"brand": "HeartLab"` → `"brand": "QFriendly"`
4. `"subtitle": "...HeartLab every day..."` → `"subtitle": "...QFriendly every day..."`
5. `"quote": "...HeartLab gave me perspective..."` → `"quote": "...QFriendly gave me perspective..."`
6. `"question": "Is HeartLab a real therapist?"` → `"question": "Is QFriendly a real therapist?"`
7. `"answer": "HeartLab is an AI relationship guidance platform..."` → `"answer": "QFriendly is an AI relationship guidance platform..."`
8. `"copyright": "© 2025 HeartLab. All rights reserved."` → `"copyright": "© 2025 QFriendly. All rights reserved."`
9. `"body": "By accessing or using HeartLab (\"the Service\")..."` → `"body": "By accessing or using QFriendly (\"the Service\")..."`
10. `"body": "HeartLab is an AI-powered relationship guidance platform..."` → `"body": "QFriendly is an AI-powered relationship guidance platform..."`
11. `"body": "...owned by HeartLab and protected by..."` → `"body": "...owned by QFriendly and protected by..."`
12. `"...support@heartlab.ai"` → `"...support@qfriendly.ai"`
13. `"...operates, HeartLab shall not be liable..."` → `"...operates, QFriendly shall not be liable..."`
14. `"...jurisdiction in which HeartLab operates"` → `"...jurisdiction in which QFriendly operates"`

- [ ] **Step 2: 更新 messages/zh.json — 精确替换 14 处**

文件路径: `qfriendly/messages/zh.json`

逐个执行替换：

1. `"title": "HeartLab — AI 爱情关系指导"` → `"title": "QFriendly — AI 爱情关系指导"`
2. `"siteName": "HeartLab"` → `"siteName": "QFriendly"`
3. `"brand": "HeartLab"` → `"brand": "QFriendly"`
4. `"subtitle": "...HeartLab 的真实情感困扰..."` → `"subtitle": "...QFriendly 的真实情感困扰..."`
5. `"quote": "...HeartLab 给了我视角..."` → `"quote": "...QFriendly 给了我视角..."`
6. `"question": "HeartLab 是真正的心理咨询师吗？"` → `"question": "QFriendly 是真正的心理咨询师吗？"`
7. `"answer": "HeartLab 是一个 AI 爱情关系指导平台..."` → `"answer": "QFriendly 是一个 AI 爱情关系指导平台..."`
8. `"copyright": "© 2025 HeartLab. 保留所有权利。"` → `"copyright": "© 2025 QFriendly. 保留所有权利。"`
9. `"body": "访问或使用 HeartLab（以下简称「本服务」）..."` → `"body": "访问或使用 QFriendly（以下简称「本服务」）..."`
10. `"body": "HeartLab 是一个基于人工智能的情感指导平台..."` → `"body": "QFriendly 是一个基于人工智能的情感指导平台..."`
11. `"body": "...归 HeartLab 所有..."` → `"body": "...归 QFriendly 所有..."`
12. `"...HeartLab 不对因使用本服务而产生..."` → `"...QFriendly 不对因使用本服务而产生..."`
13. `"...受 HeartLab 运营所在地司法管辖..."` → `"...受 QFriendly 运营所在地司法管辖..."`
14. `"...support@heartlab.ai"` → `"...support@qfriendly.ai"`

- [ ] **Step 3: 验证 JSON 合法性**

```bash
node -e "JSON.parse(require('fs').readFileSync('/home/ubuntu/project/ai/start01-qfriendly/qfriendly/messages/en.json','utf8'))" && echo "en OK"
node -e "JSON.parse(require('fs').readFileSync('/home/ubuntu/project/ai/start01-qfriendly/qfriendly/messages/zh.json','utf8'))" && echo "zh OK"
```

Expected: `en OK` 和 `zh OK`

- [ ] **Step 4: 验证无遗漏 "HeartLab"**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && grep -rn "HeartLab\|heartlab\|Heartlab" messages/ --include="*.json" | grep -v node_modules
```

Expected: 无输出（所有 HeartLab 已替换为 QFriendly）

- [ ] **Step 5: Commit**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && git add messages/en.json messages/zh.json && git commit -m "refactor: i18n messages HeartLab → QFriendly"
```

---

### Task 9: Phase 3e — 根目录 CLAUDE.md 更新

**Files:**
- Modify: `qfriendly/../CLAUDE.md` (即 `/home/ubuntu/project/ai/start01-qfriendly/CLAUDE.md`)

**Interfaces:**
- 项目指引文档，后续开发参考

- [ ] **Step 1: 更新 CLAUDE.md 中所有 heartlab 引用**

文件路径: `/home/ubuntu/project/ai/start01-qfriendly/CLAUDE.md`

精确替换（共 8 处）:

```
old (line 3): - heartlab项目根目录:heartlab/ ,一切项目代码文件，环境等文件，一律放在 heartlab/  目录下
new (line 3): - qfriendly项目根目录:qfriendly/ ,一切项目代码文件，环境等文件，一律放在 qfriendly/  目录下

old (line 6): - 使用 pg 数据库(本地):postgresql://postgres@localhost:5432/heartlab
new (line 6): - 使用 pg 数据库(本地):postgresql://postgres@localhost:5432/qfriendly

old (line 7): - 连接本地数据库方式：使用 sudo -u postgres psql -d heartlab 进行数据库查询和操作（PostgreSQL peer 认证，无需密码）
new (line 7): - 连接本地数据库方式：使用 sudo -u postgres psql -d qfriendly 进行数据库查询和操作（PostgreSQL peer 认证，无需密码）

old (line 10): - 项目的管理员账号:admin_blacker@heartlab.quan
new (line 10): - 项目的管理员账号:admin_blacker@qfriendly.quan

old (line 12): - 域名:heartlab.qfxblacker.top
new (line 12): - 域名:qfriendly.qfxblacker.top

old (line 13): - 数据库域名:db_heartlab.qfxblacker.top
new (line 13): - 数据库域名:db_qfriendly.qfxblacker.top

old (line 20): - GitHub 推送采用 SSH 方式（远程地址: git@github.com:blacker135/heartlab.git），SSH 密钥已配置于 ~/.ssh/id_ed25519
new (line 20): - GitHub 推送采用 SSH 方式（远程地址: git@github.com:blacker135/qfriendly.git），SSH 密钥已配置于 ~/.ssh/id_ed25519

old (line 21): - Vercel 项目名称: star1-relation（链接在 heartlab/ 目录下）
new (line 21): - Vercel 项目名称: qfriendly（链接在 qfriendly/ 目录下）
```

- [ ] **Step 2: 验证无遗漏**

```bash
grep -n "heartlab\|HeartLab\|Heartlab" /home/ubuntu/project/ai/start01-qfriendly/CLAUDE.md
```

Expected: 无输出

- [ ] **Step 3: 将 CLAUDE.md 也加入 heartlab repo 跟踪**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && cp ../CLAUDE.md . && git add CLAUDE.md && git commit -m "refactor: CLAUDE.md HeartLab → QFriendly"
```

CLAUDE.md 在仓库外但项目需要它，先复制一份进仓库跟踪。

---

### Task 10: Phase 4a — Vercel 环境变量同步

**Files:**
- Modify: Vercel 远程环境变量 (Production + Preview)
- Modify: `qfriendly/.env.vercel.prod` (pull 后自动更新)
- Modify: `qfriendly/.env.vercel.dev` (pull 后自动更新)
- Modify: `qfriendly/.env.local` (之前已更新过，此时再对齐)

**Interfaces:**
- 消费: Task 6 中已更新的 `qfriendly/.env.local` 作为参考值

- [ ] **Step 1: 更新 Vercel Production BETTER_AUTH_URL**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && echo -n "https://qfriendly.qfxblacker.top" | vercel env add BETTER_AUTH_URL production
```

Expected: 成功添加

- [ ] **Step 2: 更新 Vercel Production NEXT_PUBLIC_APP_URL**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && echo -n "https://qfriendly.qfxblacker.top" | vercel env add NEXT_PUBLIC_APP_URL production
```

Expected: 成功添加

- [ ] **Step 3: 更新 Vercel Production NEXT_PUBLIC_AUTH_URL**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && echo -n "https://qfriendly.qfxblacker.top/api/auth" | vercel env add NEXT_PUBLIC_AUTH_URL production
```

Expected: 成功添加

- [ ] **Step 4: 更新 Vercel Production DATABASE_URL**

先从 .env.local 获取当前 DATABASE_URL 的 host/password 部分（含 db_qfriendly 域名和 qfriendly 数据库名）：

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && source .env.local && echo -n "$DATABASE_URL" | sed 's|/heartlab?|/qfriendly?|' | sed 's|@[^/]*|@db_qfriendly.qfxblacker.top|' | vercel env add DATABASE_URL production
```

Expected: 成功添加

- [ ] **Step 5: 更新 Vercel Preview 同名变量**

重复 Step 1-4，将 `production` 改为 `preview`:

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly
echo -n "https://qfriendly.qfxblacker.top" | vercel env add BETTER_AUTH_URL preview
echo -n "https://qfriendly.qfxblacker.top" | vercel env add NEXT_PUBLIC_APP_URL preview
echo -n "https://qfriendly.qfxblacker.top/api/auth" | vercel env add NEXT_PUBLIC_AUTH_URL preview
source .env.local && echo -n "$DATABASE_URL" | sed 's|/heartlab?|/qfriendly?|' | sed 's|@[^/]*|@db_qfriendly.qfxblacker.top|' | vercel env add DATABASE_URL preview
```

Expected: 全部成功

- [ ] **Step 6: 拉取远程环境到本地对照文件**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && vercel env pull production && vercel env pull preview
```

Expected: `.env.vercel.prod` 和 `.env.vercel.dev` 已更新

- [ ] **Step 7: Commit 更新后的 .env.vercel.* 文件**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && git add .env.vercel.prod .env.vercel.dev && git commit -m "chore: sync Vercel env for qfriendly domain rename"
```

---

### Task 11: Phase 4b — Git 远程地址更新 & 推送

**Files:**
- Modify: `.git/config` (git remote)

**Interfaces:**
- 消费: 所有之前的 commit

- [ ] **Step 1: 更新 Git 远程地址**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && git remote set-url origin git@github.com:blacker135/qfriendly.git
```

- [ ] **Step 2: 验证远程地址**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && git remote -v
```

Expected: `origin  git@github.com:blacker135/qfriendly.git (fetch)` 和 `(push)`

- [ ] **Step 3: 推送到新远程仓库**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && git push origin master
```

Expected: 推送成功（无拒绝错误）

- [ ] **Step 4: 确认 Vercel 自动部署触发**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && vercel list 2>&1 | head -5
```

Expected: 出现新的部署记录

---

### Task 12: Phase 4c — 验证

**Files:**
- 无需修改（验证任务）

**Interfaces:**
- 消费: Vercel 最新部署

- [ ] **Step 1: 运行单元测试**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && sudo npm test 2>&1
```

Expected: 所有测试通过

- [ ] **Step 2: 检查 Vercel 部署状态**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && vercel ls 2>&1
```

Expected: 最新部署状态为 READY

- [ ] **Step 3: 访问新域名验证可访问性**

使用 Playwright MCP 浏览器导航到 `https://qfriendly.qfxblacker.top`

Expected: 页面正常加载，品牌名显示 QFriendly

- [ ] **Step 4: 验证 AI 聊天功能 (SSE)**

使用 Playwright MCP 浏览器：
1. 登录: `admin_blacker@qfriendly.quan` / `blacker_admin123`
2. 进入聊天页
3. 发送一条消息
Expected: AI 回复正常流式输出

- [ ] **Step 5: 验证中英文文案**

在浏览器中切换语言 en/zh，检查以下位置品牌名均为 QFriendly:
- 页面标题 (tab title)
- 导航栏 brand
- 页脚 copyright
- Terms/Privacy/Refund 正文

Expected: 所有位置无 "HeartLab" 残留

- [ ] **Step 6: Commit 最终验证通过标记**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && git add -A && git commit -m "verify: HeartLab → QFriendly rename complete"
```

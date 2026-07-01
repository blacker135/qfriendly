# 介绍
- 本项目生产和测试主要在 vercel 上进行，而数据库则在本地,项目可以通过域名远程访问本地数据库
- qfriendly项目根目录:qfriendly/ ,一切项目代码文件，环境等文件，一律放在 qfriendly/  目录下

# 注意
- 使用 pg 数据库(本地):postgresql://postgres@localhost:5432/qfriendly
- 连接本地数据库方式：使用 sudo -u postgres psql -d qfriendly 进行数据库查询和操作（PostgreSQL peer 认证，无需密码）

# 数据
- 项目的管理员账号:admin_blacker@qfriendly.quan
- 项目的管理员密码:blacker_admin123
- 域名:qfriendly.qfxblacker.top
- 数据库域名:db_qfriendly.qfxblacker.top

# 硬性约束
- 沟通语言:向用户输出，一律采用中文
- 项目部署:先推送到 github(ssh)，然后 vercel 从 github 拉取项目进行部署(本地环境有 vercel cli）- 部署前，先检查vercel 是否正在部署项目，如果是，则 vercel 极有可能已自动拉取 github 自动部署项目
- vercel 上的环境配置要和本地环境 env 配置保持一致和同步更新(vercel 和 环境env文件 要一模样，方便检查和控制项目环境 ) 
- 注释:项目需要有注释(清晰，干净，有条理)保证后续工作交接的便利。项目每个模块和文件需要注释，服务层函数和接口需要注释进行解释
- GitHub 推送采用 SSH 方式（远程地址: git@github.com:blacker135/qfriendly.git），SSH 密钥已配置于 ~/.ssh/id_ed25519
- Vercel 项目名称: qfriendly（链接在 qfriendly/ 目录下）
- 禁止本地运行项目，如需运行项目，则在 vercel 上运行
- 项目唯一 git 仓库位于 qfriendly/，所有 git 操作（commit/push/pull/log）必须在此目录下执行
- 编写 plan 时，对代码的引用（文件路径、配置值、常数值）必须先实际读取源文件确认，禁止凭记忆写入

# 强制 sudo 执行命令行的命令
- npm 相关命令


## 环境变量文件命名规范
| 文件 | 用途 | 说明 |
|------|------|------|
| `.env.local` | 本地开发环境 | Next.js dev server 直接读取 (`npm run dev`)，不推送到 Git |
| `.env.vercel.prod` | 远程 Vercel 生产环境 | 与 `vercel env pull production` 内容一致，供手动对照同步 |
| `.env.vercel.dev` | 远程 Vercel 预览环境 | 与 `vercel env pull preview` 内容一致，供手动对照同步 |
| `.env.local.example` | 环境变量模板 | 提交到 Git，供新开发者参考复制 |

### 同步流程
1. `vercel env pull` 拉取远程环境 → 覆盖对应 `.env.vercel.*` 文件
2. 对比 `.env.vercel.*` 与 `.env.local`，手动同步需要一致的变量
3. `vercel env add` 或 Dashboard 修改远程变量后，重新执行步骤 1

# 项目结构速览

```
qfriendly/
├── app/                       # Next.js App Router
│   ├── [lang]/                # 用户端页面 (en/zh)
│   ├── admin/                 # 管理后台页面
│   └── api/                   # API 路由（18 个接口）
├── components/                # React 组件（按功能域分组）
├── lib/                       # 服务层
│   ├── admin/guard.ts         # 管理员权限守卫
│   ├── auth/                  # Better Auth 实例
│   ├── db/                    # Drizzle ORM Schema + 连接
│   ├── deepseek/client.ts     # DeepSeek API 客户端
│   ├── paypal/                # PayPal API + Plan 映射
│   ├── prompts/experts.ts     # 专家 System Prompt
│   ├── stats/                 # 数据统计查询引擎
│   └── subscription/gate.ts   # 订阅门控
├── i18n/                      # next-intl 配置
├── messages/                  # 翻译文件 (en.json, zh.json)
├── scripts/                   # 运维脚本
└── __tests__/                 # 单元测试
```

# 模块索引

快速定位：想改 X → 找 Y 文件 → 参考 Z 文档

| 需求 | 入口文件 | 参考文档 |
|------|----------|----------|
| 修改专家人格/System Prompt | `lib/prompts/experts.ts` | 产品文档 §AI 情感对话 |
| 修改 AI 模型/API 地址 | `lib/deepseek/client.ts` | 技术文档 §核心架构决策 |
| 修改订阅方案/定价 | 环境变量 PAYPAL_PLAN_* | 产品文档 §订阅方案 |
| 修改门控逻辑（试用/限额） | `lib/subscription/gate.ts` | 技术文档 §订阅门控 |
| 添加 API 接口 | `app/api/**/route.ts` | API 接口文档 |
| 修改数据库表结构 | `lib/db/schema.ts` | 数据库文档 |
| 修改前端页面 | `app/**/page.tsx` | UI 设计文档 §页面结构 |
| 修改组件 | `components/**/*.tsx` | UI 设计文档 §组件体系 |
| 修改国际化文案 | `messages/en.json` `messages/zh.json` | — |
| 管理后台功能 | `app/admin/**` `components/admin/**` | API 文档 §管理后台模块 |
| 统计查询 | `lib/stats/query.ts` | 技术文档 §数据统计引擎 |
| 部署/环境变量 | 环境变量文件 + `vercel.json` | 技术文档 §部署 |

# 文档同步规则
- 功能变更后，检查 docs/项目文档/ 下对应文件是否需要更新
- 每次文档修改，更新头部「最后更新」日期和「对应 commit」
- 部署前检查：git log 中新功能/改接口/改表结构的 commit 日期晚于文档日期时，先更新再部署


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


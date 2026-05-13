# 注意
- 使用 pg 数据库(本地):postgresql://postgres@localhost:5432/lunara
- 连接本地数据库方式：使用 sudo -u postgres psql -d lunara 进行数据库查询和操作（PostgreSQL peer 认证，无需密码）


# 硬性约束
- 沟通语言:向用户输出，一律采用中文
- 运维:你必须通过 shell 脚本进行本地项目的启停和运维(项目根目录/scripts)
- 项目部署:先推送到 github(ssh)，然后 vercel 从 github 拉取项目进行部署(本地环境有 vercel cli）
- vercel 上的环境配置要和本地环境 env 配置保持一致和同步更新(vercel 和 环境env文件 要一模样，方便检查和控制项目环境 ) 
- 注释:项目需要有注释(清晰，干净，有条理)保证后续工作交接的便利。项目每个模块和文件需要注释，服务层函数和接口需要注释进行解释

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


---
最后更新: 2026-07-01
对应 commit: 63e413f
覆盖模块: 全部 API 接口
---

# QFriendly API 接口设计文档

## 接口总览

| 模块 | 方法 | 路径 | 用途 |
|------|------|------|------|
| 认证 | * | /api/auth/[...all] | Better Auth 托管（登录/注册/会话） |
| 对话 | POST | /api/chat | SSE 流式对话 |
| 对话 | POST | /api/chat/switch | 切换专家 + 过渡消息 |
| 对话 | GET | /api/conversations | 获取对话列表 |
| 对话 | POST | /api/conversations | 创建新对话 |
| 对话 | GET | /api/conversations/[id] | 获取对话详情 + 消息 |
| 对话 | PATCH | /api/conversations/[id]/title | 修改对话标题 |
| 对话 | DELETE | /api/conversations/[id] | 删除对话 |
| 订阅 | POST | /api/subscription/activate | 激活 PayPal 订阅 |
| 订阅 | GET | /api/subscription/status | 查询当前订阅状态 |
| 订阅 | POST | /api/subscription/webhook | PayPal Webhook 回调 |
| 设置 | POST | /api/settings/name | 修改用户名 |
| 设置 | POST | /api/settings/email | 发送邮箱变更验证 |
| 设置 | POST | /api/settings/password | 修改密码 |
| 管理 | GET | /api/admin/dashboard | 仪表盘概览 |
| 管理 | GET | /api/admin/stats/project | 项目数据统计 |
| 管理 | GET | /api/admin/stats/traffic | 流量数据统计 |
| 管理 | GET | /api/admin/users | 用户列表 |
| 管理 | GET/PATCH/DELETE | /api/admin/users/[id] | 用户详情/编辑/删除 |
| 系统 | GET | /api/cron/cleanup | 定时清理过期消息 |

所有接口均部署在香港区域 (`regions: ['hkg1']`)。

## 认证说明

除 webhook 和 cron 外，所有接口需要登录态（Better Auth session cookie）。
管理后台接口额外要求用户拥有 `subscriptions.variant_name = 'admin'` 的活跃订阅。

## 对话模块

### POST /api/chat

SSE 流式对话。首次调用时不传 `conversation_id`，服务端自动创建对话。

**请求体:**
```json
{
  "conversation_id": "uuid | undefined",
  "expert": "evan | liam | noah | adrian",
  "language": "en | zh",
  "message": "string (必填)"
}
```

**SSE 事件流:**
```
data: {"conversation_id": "uuid"}
data: {"content": "文本片段"}
data: {"content": "更多文本"}
data: [DONE]
```

**错误码:**
| 状态码 | 说明 |
|--------|------|
| 401 | 未登录 |
| 400 | 参数无效（缺少 message / expert 不合法） |
| 402 | 试用次数用完 (TRIAL_EXHAUSTED) |
| 429 | 日限额到达 (DAILY_LIMIT) 或速率限制 |
| 403 | 专家锁定（Start 用户无法访问 Noah/Adrian） |
| 404 | 对话不存在 |
| 403 | 对话不属于当前用户 |

**AI 回复深度（max_tokens）与方案对应:**
| 方案 | max_tokens |
|------|-----------|
| 试用/未订阅 | 512 |
| Start | 512 |
| Pro | 1024 |
| Ultra | 2048 |

### POST /api/chat/switch

切换对话专家。无历史消息时返回固定欢迎语（非流式），有历史时通过 SSE 生成过渡消息。

**请求体:**
```json
{
  "conversation_id": "uuid (必填)",
  "new_expert": "evan | liam | noah | adrian",
  "language": "en | zh"
}
```

**响应（无历史时，非流式）:**
```json
{ "content": "欢迎语文本", "expert": "evan" }
```

**响应（有历史时，SSE 流式）:** 同 /api/chat 的 SSE 格式。

### GET /api/conversations

返回当前用户的对话列表，按 `updatedAt` 降序。

**响应:**
```json
{
  "conversations": [
    { "id": "uuid", "expert": "liam", "title": "...", "language": "en", "updatedAt": "...", "createdAt": "..." }
  ]
}
```

### POST /api/conversations

创建空白新对话。

**请求体（可选）:**
```json
{ "expert": "liam", "language": "en" }
```

**限制:** Ultra 用户最多 1000 个对话。

**响应 201:**
```json
{ "conversation": { "id": "uuid", "expert": "liam", ... } }
```

### GET /api/conversations/[id]

获取单个对话及其全部消息（按时间升序）。

**响应:**
```json
{
  "conversation": { "id": "uuid", "expert": "...", "title": "...", ... },
  "messages": [ { "id": "uuid", "role": "user|assistant", "content": "...", "createdAt": "..." } ]
}
```

### PATCH /api/conversations/[id]/title

**请求体:**
```json
{ "title": "新标题（必填，trim 后非空）" }
```

### DELETE /api/conversations/[id]

删除对话，级联删除关联消息。返回 `{ "success": true }`。

## 订阅模块

### POST /api/subscription/activate

用户完成 PayPal 审批后调用，验证并存储订阅。

**请求体:**
```json
{ "subscription_id": "PayPal 订阅 ID", "plan_id": "PayPal Plan ID" }
```

**流程:** 调 PayPal API 验证 → Plan ID 映射 variantName → upsert 到 subscriptions 表。

**响应:**
```json
{ "success": true, "variant": "start|pro|ultra" }
```

### GET /api/subscription/status

返回当前用户的订阅状态和试用情况。

**响应:**
```json
{
  "subscribed": true,
  "variant": "pro",
  "status": "active",
  "period_end": "2026-08-01T00:00:00.000Z",
  "trial_used": 2,
  "trial_limit": 3
}
```

### POST /api/subscription/webhook

PayPal Webhook 回调入口。**无需登录态**，通过 PayPal 签名验证。

**处理的 PayPal 事件:**
- `BILLING.SUBSCRIPTION.ACTIVATED` / `RENEWED` → 创建/更新订阅为 active
- `CANCELLED` / `SUSPENDED` / `EXPIRED` → 更新状态
- `PAYMENT_FAILED` → 记录日志并更新状态
- `UPDATED` → 同步 plan/status/period 变更

## 用户设置模块

### POST /api/settings/name
**请求体:** `{ "name": "新用户名（trim 后非空）" }`
**调用:** Better Auth `updateUser`

### POST /api/settings/email
**请求体:** `{ "newEmail": "新邮箱（含 @）" }`
**调用:** Better Auth `changeEmail`（发送验证邮件）

### POST /api/settings/password
**请求体:** `{ "currentPassword": "当前密码", "newPassword": "新密码（≥8 位）" }`
**调用:** Better Auth `changePassword`（不撤销其他会话）

## 管理后台模块

所有接口需要 admin 权限（见[认证说明](#认证说明)）。

### GET /api/admin/dashboard
**响应:**
```json
{
  "totalUsers": 100,
  "activeSubscriptions": 25,
  "todayMessages": 42,
  "totalRevenue": 1999.00
}
```

### GET /api/admin/stats/project
**参数:** `start`, `end`（YYYY-MM-DD，默认今天）
**响应:** dau/message 序列 + 总量统计 + 专家分布 + 付费序列 + 留存率(d1/d7/d30)

### GET /api/admin/stats/traffic
**参数:** `start`, `end`（YYYY-MM-DD，默认今天）
**响应:** `{ dates, pv, uv, exposure }` 序列

### GET /api/admin/users
**参数:** `search` (模糊搜索 name/email), `variant` (free/start/pro/ultra/admin), `page`, `pageSize`
**响应:**
```json
{
  "users": [{ "id": "...", "name": "...", "email": "...", "variantName": "pro", "subscriptionStatus": "active", "messageCount": 50, ... }],
  "total": 150
}
```

### GET /api/admin/users/[id]
用户详情，含订阅信息 + 消息统计 + 日限额。

### PATCH /api/admin/users/[id]
编辑用户：支持 name/email/password/variantName/currentPeriodEnd/dailyLimit。
- `variantName = 'free'` → 取消现有订阅
- `variantName = 'start/pro/ultra/admin'` → 创建或更新手动订阅
- `password` → 通过 Better Auth `hashPassword` 加密写入 account 表

### DELETE /api/admin/users/[id]
删除用户，CASCADE 自动清理关联数据。

## 系统模块

### GET /api/cron/cleanup
Vercel Cron Job 定时调用（每天凌晨 3:00）。

**鉴权:** `Authorization: Bearer <CRON_SECRET>` header。

**分层清理策略:**
| 用户类型 | 保留期限 | 说明 |
|----------|---------|------|
| Start / 未订阅 | 7 天 | 删除 7 天前的 messages |
| Pro | 30 天 | 删除 30 天前的 messages |
| Ultra | 不清理 | — |

## 相关文档

- [数据库文档](./数据库文档.md)
- [技术文档](./技术文档.md)
- [产品文档](./产品文档.md)

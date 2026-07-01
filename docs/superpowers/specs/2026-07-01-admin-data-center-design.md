---
最后更新: 2026-07-01
对应 commit: (待实施后更新)
覆盖模块: 管理后台数据中心 (A.收入分析 B.用户行为 C.统计自动化 D.综合仪表盘)
---

# QFriendly 管理后台数据中心 — 完整设计规格

## 概述

从产品最终形态出发，对管理后台数据中心进行全面升级。覆盖四个方面：
- **A.** 收入与订阅分析（事件溯源 + 21 指标）
- **B.** 用户行为洞察（会话级追踪 + 16 指标）
- **C.** 统计自动化 + 数据导出（Cron 聚合 + CSV/PDF）
- **D.** 综合仪表盘升级（实时总览 + 模块化概览）

---

## 一、A. 收入与订阅分析

### 1.1 设计决策汇总

| 决策点 | 选择 |
|--------|------|
| 数据模型 | 事件溯源 — `subscription_events` 表，7 种事件类型 |
| MRR 计算 | 事件 + Cron 物化 `mrr_snapshots` 缓存（混合模式） |
| 事件采集时机 | PayPal Webhook 联动写入 subscription_events |
| 历史数据 | Migration script 回填已有订阅记录 |
| 年付 MRR | 不计入 MRR，仅统计月付用户 |
| 页面布局 | Tab 分页：收入概览 / 转化漏斗 / 流失分析 |

### 1.2 新增数据表

#### subscription_events

```sql
-- 订阅事件溯源表，每条记录代表一次订阅状态变更
CREATE TABLE subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- created|renewed|upgraded|downgraded|cancelled|expired|reactivated
  plan TEXT NOT NULL,        -- start|pro|ultra|admin
  billing_period TEXT,       -- monthly|yearly
  amount NUMERIC(10,2),      -- 实际支付金额
  paypal_subscription_id TEXT NOT NULL,
  previous_plan TEXT,        -- 升级/降级时的原方案
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_sub_events_user ON subscription_events(user_id, created_at);
CREATE INDEX idx_sub_events_type ON subscription_events(event_type, created_at);
```

#### mrr_snapshots

```sql
-- MRR 物化缓存表，每日 Cron 从 subscription_events 聚合写入
CREATE TABLE mrr_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  plan TEXT NOT NULL,              -- start|pro|ultra|all
  mrr_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  subscriber_count INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER DEFAULT 0,     -- 当日新增订阅数
  churn_count INTEGER DEFAULT 0,   -- 当日流失订阅数
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(date, plan)
);
```

### 1.3 指标体系（21 个）

#### 核心收入指标

| # | 指标 | 数据来源 | 计算方式 |
|---|------|---------|---------|
| 1 | MRR | mrr_snapshots | 所有月付活跃订阅的月化收入总和 |
| 2 | ARR | mrr_snapshots | 所有年付活跃订阅的年化收入总和 |
| 3 | MRR 净增 | subscription_events | 新增 MRR + 扩展 - 流失 - 收缩 |
| 4 | 各方案 MRR 占比 | mrr_snapshots by plan | 按 plan 分组聚合 |
| 5 | 累计收入总额 | analytics_events payment_completed | SUM(payload.amount) |

#### 客户指标

| # | 指标 | 数据来源 | 计算方式 |
|---|------|---------|---------|
| 6 | 付费用户总数 | subscription_events | COUNT(DISTINCT user_id) WHERE status=active |
| 7 | 新增付费用户 | subscription_events | 本期首次 subscription_created 的用户数 |
| 8 | 流失付费用户 | subscription_events | 本期 cancelled/expired 的用户数 |
| 9 | ARPPU | 计算 | MRR ÷ 付费用户数 |

#### 转化漏斗

| # | 指标 | 数据来源 | 计算方式 |
|---|------|---------|---------|
| 10 | 游客→注册 转化率 | sessions + auth_register | 有 page_view 的 anonymous_id → 有 auth_register 的比例 |
| 11 | 注册→活跃 转化率 | auth_register + message_sent | 注册后至少发 1 条消息的比例 |
| 12 | 活跃→付费 转化率 | message_sent + subscription_created | 试用用户中最终订阅的比例 |
| 13 | 试用→付费 平均时长 | auth_register + subscription_created | 注册到首次订阅的平均天数 |
| 14 | 新订阅方案选择比例 | subscription_events | 新订阅中各方案占比 |

#### 流失分析

| # | 指标 | 数据来源 | 计算方式 |
|---|------|---------|---------|
| 15 | 客户流失率 | subscription_events | 本期流失数 ÷ 期初付费用户数 |
| 16 | 收入流失率 | subscription_events | 流失用户的 MRR ÷ 期初总 MRR |
| 17 | 按方案流失率 | subscription_events by plan | 按方案分组的流失率 |
| 18 | 按使用时长流失分布 | subscription_events | 订阅 N 个月后流失的概率 (1M/3M/6M/9M/12M) |

#### 升级/降级

| # | 指标 | 数据来源 | 计算方式 |
|---|------|---------|---------|
| 19 | 升级/降级次数 | subscription_events upgraded/downgraded | COUNT(upgraded) + COUNT(downgraded) |
| 20 | 升级率 | 计算 | 升级用户数 ÷ 总付费用户 |

#### LTV

| # | 指标 | 数据来源 | 计算方式 |
|---|------|---------|---------|
| 21 | LTV | 计算 | ARPPU ÷ 月度流失率，按方案拆分 |

### 1.4 事件采集：PayPal Webhook 联动

在现有 `/api/subscription/webhook` 中扩展：

```
BILLING.SUBSCRIPTION.CREATED   → INSERT subscription_events (event_type: created)
BILLING.SUBSCRIPTION.RENEWED   → INSERT subscription_events (event_type: renewed)
BILLING.SUBSCRIPTION.CANCELLED → INSERT subscription_events (event_type: cancelled)
BILLING.SUBSCRIPTION.EXPIRED   → INSERT subscription_events (event_type: expired)
BILLING.SUBSCRIPTION.UPDATED (plan change) → INSERT (event_type: upgraded/downgraded)
```

### 1.5 匿名访客标识

- `page_view` 事件的 payload 增加 `anonymous_id` 字段
- 前端在 `Providers.tsx` 中生成 UUID 存储到 cookie（`qf_anonymous_id`，有效期 90 天）
- `trackPageView()` 携带 anonymous_id 写入事件 payload
- 注册时关联 anonymous_id → user_id

---

## 二、B. 用户行为洞察

### 2.1 设计决策汇总

| 决策点 | 选择 |
|--------|------|
| 数据粒度 | 会话级别 + 对话级别 |
| 会话定义 | 30 分钟无交互超时 |
| 采集机制 | 混合模式：对话页 10min 心跳 + 其他页面用 page_view 推断 |
| 心跳间隔 | 管理后台可配置（默认 10 分钟，范围 3-30 分钟） |
| 设备/地理 | sessions 表记录 device_type、country |
| 指标体系 | 16 个指标（活跃度 5 + 分层 3 + 深度 4 + 专家使用 4） |
| 分层规则 | 5 层，阈值管理后台可配置 |
| 页面布局 | 新增独立「用户行为分析」页，4 个 Tab |

### 2.2 新增数据表

#### sessions

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
  anonymous_id TEXT,             -- 未登录游客的匿名标识
  started_at TIMESTAMP NOT NULL DEFAULT now(),
  last_heartbeat_at TIMESTAMP NOT NULL DEFAULT now(),
  ended_at TIMESTAMP,            -- 会话结束后回填
  duration_seconds INTEGER,      -- 会话时长（回填）
  device_type TEXT,              -- desktop|mobile|tablet
  country TEXT,                  -- 国家代码
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_sessions_user ON sessions(user_id, started_at);
CREATE INDEX idx_sessions_anonymous ON sessions(anonymous_id);
```

### 2.3 会话采集机制

#### 前端心跳（对话页）

- 在 ChatInput 和 MessageList 组件中启动心跳定时器
- 间隔：默认 10 分钟（从统计设置页读取配置）
- POST `/api/analytics/heartbeat` { session_id, path, anonymous_id }
- 后端：更新 sessions.last_heartbeat_at，如果 session_id 不存在则创建

#### 页面事件推断（非对话页）

- 离线聚合时，按 user_id + adjacent page_view interval ≤ 30min 推断会话边界
- 在 processDailyStats 中执行

#### 会话关闭 (Cron)

- 每 30 分钟执行：关闭 last_heartbeat_at > 30min 的会话
- 写入 ended_at = last_heartbeat_at + 30min
- 计算 duration_seconds

### 2.4 指标体系（16 个）

#### 活跃度

| # | 指标 | 说明 |
|---|------|------|
| 1 | DAU / WAU / MAU | 日/周/月活跃用户数 |
| 2 | DAU/MAU 比值 | 粘性指标（健康值 >20%） |
| 3 | 会话数 | 每日/每周会话总数 |
| 4 | 平均会话时长 | 用户每次访问平均停留时间 |
| 5 | 人均日会话数 | 同一用户一天来几次 |

#### 用户分层

| # | 指标 | 说明 |
|---|------|------|
| 6 | 活跃度分层 | 高活(≥20天)/中活(7-19)/低活(1-6)/流失风险/已流失 |
| 7 | 各层占比趋势 | 每周各层比例变化 |
| 8 | 用户生命周期阶段 | <7天 / 7-30天 / 30-90天 / >90天 |

#### 对话深度

| # | 指标 | 说明 |
|---|------|------|
| 9 | 日均消息数 | 每日消息总量 |
| 10 | 人均会话消息数 | 一次会话中用户发了多少消息 |
| 11 | 对话完成率 | 有来回的对话（>1条用户消息）占比 |
| 12 | 平均轮次 | 用户↔AI 的往返次数 |

#### 专家使用

| # | 指标 | 说明 |
|---|------|------|
| 13 | 各专家使用占比 | 各专家对话数 |
| 14 | 各专家人均消息数 | 不同专家的粘性差异 |
| 15 | 专家切换频率 | 每次对话中切换专家的次数 |
| 16 | 专家偏好路径 | Top 切换路径排行 |

---

## 三、D. 综合仪表盘升级

### 3.1 设计决策

| 决策点 | 选择 |
|--------|------|
| 定位 | 实时监控 + 全貌总览融合 |
| 布局 | 顶部 5 实时指标卡片 + 下方 6 模块概览区 (2×3 网格) |
| 迷你趋势图 | 每张卡片含迷你图，支持 7 天/30 天切换 |
| 交互 | 各模块卡片可点击跳转到对应分析页 |

### 3.2 布局结构

```
┌────────────────────────────────────────┐
│ 实时指标栏 (5 卡片, grid-cols-5)         │
│ 今日收入 | 今日新增 | 今日活跃 | 今日消息 | 当前在线│
├────────────────────────────────────────┤
│ 模块概览区 (6 卡片, grid-cols-2 × 3 行)   │
│                                        │
│ 收入概览        │ 用户活跃               │
│ 转化漏斗        │ 订阅健康               │
│ 流量概览        │ 专家热度               │
└────────────────────────────────────────┘
```

### 3.3 实时指标卡片设计

| 卡片 | 主指标 | 对比 | 特殊 |
|------|--------|------|------|
| 今日收入 | $金额 | ↑/↓ vs 昨日同时段 | 迷你 sparkline |
| 今日新增用户 | 数字 | ↑/↓ vs 昨日 | 迷你 sparkline |
| 今日活跃用户 | DAU | ↑/↓ vs 昨日 | 迷你 sparkline |
| 今日消息数 | 数字 | ↑/↓ vs 昨日 | 迷你 sparkline |
| 当前在线 | 数字 | — | 绿色脉冲圆点 (animate-pulse) |

- 上涨 → ↑ 绿色 #22C55E | 下跌 → ↓ 红色 #EF4444 | 持平 → → 灰色
- 数据用 Framer Motion 入场动画: `animate={{ opacity: [0,1], y: [8,0] }}`

### 3.4 模块概览卡片设计

每张卡片结构：
```
┌────────────────────────┐
│ 图标 + 标题    7天 ▫ 30天 │  ← 标题行 + 切换按钮
│                        │
│ 关键指标数字并排          │  ← 2-3个大数字
│                        │
│ ┌────────────────────┐ │
│ │ 迷你趋势图 (120px)   │ │  ← Recharts 无坐标轴折线
│ └────────────────────┘ │
│                        │
│ 查看详情 →             │  ← 点击跳转
└────────────────────────┘
```

| 卡片 | 关键指标 | 迷你图 | 跳转 |
|------|---------|--------|------|
| 收入概览 | MRR / ARPPU / 付费用户 | MRR 趋势线 | /admin/revenue |
| 用户活跃 | DAU/MAU / WAU / MAU | DAU 趋势线 | /admin/behavior?tab=1 |
| 转化漏斗 | 4 层漏斗压缩条 | — | /admin/revenue?tab=2 |
| 订阅健康 | 新增 vs 流失 / 流失率 | 净增趋势线 | /admin/revenue?tab=3 |
| 流量概览 | PV / UV / 曝光 | PV+UV 双线 | /admin/traffic |
| 专家热度 | 4 专家横条图 | — | /admin/behavior?tab=4 |

### 3.5 转化漏斗卡片（特殊布局）

漏斗横条随数值等比缩放：
```
游客   1,200 ──────────────
           ↓ 28.3%
注册     340 ─────────
           ↓ 52.9%
活跃     180 ────
           ↓ 6.7%
付费      12 ─
           ↓ 83.3%
持续      10 ▎
```

---

## 四、C. 统计自动化 + 数据导出

### 4.1 设计决策

| 决策点 | 选择 |
|--------|------|
| Cron 任务 | 每日 0:05 聚合 + 每 30 分钟会话清理 |
| 实时数据 | 今天数据动态查询原始表，历史读缓存 |
| 导出格式 | CSV + PDF |
| PDF 生成 | 前端 html2canvas + jsPDF |
| 报表类型 | 周报 + 月报 + 自定义日期范围 |
| PDF 内容 | 简洁摘要(3-4页) + 完整数据(10+页)，可选 |

### 4.2 Cron Job 扩展

#### /api/cron/daily-stats (每天 0:05)

```
processDailyStats(yesterday)      — DAU, message_count, PV, UV, homepage_exposure, payment_total, payment_rate
processRetention(yesterday, D1/D7/D30) — 留存率
processMonthlyAggregation(上月)    — 如果今天是月初
processMRRSnapshot(yesterday)     — MRR 快照
processSessionAggregation(yesterday) — 会话聚合
```

#### /api/cron/session-cleanup (每 30 分钟)

```
关闭 last_heartbeat_at > 30min 的 sessions
写入 ended_at, duration_seconds
```

### 4.3 实时数据查询策略

API 层统一逻辑：
```typescript
if (dateRange.end === TODAY) {
  历史数据 → analytics_daily_stats / mrr_snapshots
  今天数据 → 动态查询原始表 (messages, subscription_events, sessions)
} else {
  全部数据 → 缓存表
}
```

### 4.4 PDF 报表

| 类型 | 频率 | 内容 |
|------|------|------|
| 周报 | 每周一自动生成 | 本周关键指标 + 与上周对比 + 趋势图 |
| 月报 | 每月 1 号自动生成 | 月度完整分析 + 环比 + 全部图表 |
| 自定义 | 按需手动选择日期范围 | 灵活选择时间范围和数据模块 |

| 格式 | 说明 |
|------|------|
| 简洁摘要 | 3-4 页，关键指标卡片 + 2-3 张趋势图 + 简短文字解读 |
| 完整数据 | 10+ 页，包含全部统计图表的完整版 |

PDF 生成方式：前端用 `html2canvas` 截图数据卡片 + `jsPDF` 打包为 PDF，生成时显示进度条。

### 4.5 统计设置页配置项

| 配置项 | 默认值 | 说明 |
|--------|-------|------|
| 心跳间隔 | 10 分钟 | 对话页心跳请求间隔 (范围 3-30) |
| 高活阈值 | ≥20 天 | 过去 30 天活跃天数 |
| 中活阈值 | 7-19 天 | 过去 30 天活跃天数 |
| 低活阈值 | 1-6 天 | 过去 30 天活跃天数 |
| 流失风险 | 7-30 天未活跃 | — |
| 已流失 | >30 天未活跃 | — |
| sessions 保留 | 90 天 | — |
| analytics_events 保留 | 365 天 | — |
| subscription_events 保留 | 永久 | — |

---

## 五、UI 设计系统

### 5.1 与现有系统保持一致

- 深色主题：`--background: #1A1A2E`, `--surface: #2D2D44`
- 字体：`Inter, SF Pro Display, PingFang SC`
- 图表库：Recharts
- 动画：Framer Motion (duration: 150-300ms)
- CSS 框架：Tailwind CSS 4
- 圆角：卡片 `rounded-xl`，按钮 `rounded-lg`

### 5.2 新增颜色变量（补充到 globals.css）

```css
--color-success: #22C55E;      /* 上涨/正向 */
--color-danger: #EF4444;       /* 下跌/流失 */
--color-warning: #F59E0B;      /* 警告 */
--color-info: #3B82F6;         /* 信息 */
--color-chart-1: #3B82F6;      /* 图表蓝 */
--color-chart-2: #10B981;      /* 图表绿 */
--color-chart-3: #F59E0B;      /* 图表黄 */
--color-chart-4: #EF4444;      /* 图表红 */
--color-chart-5: #8B5CF6;      /* 图表紫 */
```

### 5.3 通用组件规范

| 组件 | 规范 |
|------|------|
| Tab 导航 | Framer Motion layoutId 滑动下划线，active: text-blue-500 + border-b-2 |
| KPI 卡片 | bg-surface rounded-xl border border-gray-700 p-5 |
| 迷你趋势图 | Recharts LineChart, 无坐标轴, height: 30-40px (KPI卡片) / 120px (模块卡片) |
| 日期筛选 | Preset pill 按钮组 + 自定义 date input |
| 导出按钮 | border rounded-lg + hover:bg-gray-100 |
| 数据表格 | DataTable 复用现有组件，深色适配 |
| 骨架屏 | animate-pulse bg-gray-700 rounded |

### 5.4 侧边栏导航重构

```
📊 总览
  └ 综合仪表盘      /admin/dashboard
👥 用户体系
  └ 用户管理        /admin/users
💰 收入分析
  └ 收入分析        /admin/revenue    (3 Tab)
📈 用户洞察
  └ 用户行为分析     /admin/behavior   (4 Tab)
🌐 流量分析
  └ 流量统计        /admin/traffic
📋 数据服务
  ├ 报表导出        /admin/reports
  └ 统计设置        /admin/settings
```

---

## 六、页面路由与 API 规划

### 6.1 新增页面

| 路由 | 页面 | 组件文件 |
|------|------|---------|
| `/admin/revenue` | 收入分析 | `app/admin/revenue/page.tsx` |
| `/admin/behavior` | 用户行为分析 | `app/admin/behavior/page.tsx` |
| `/admin/reports` | 报表导出 | `app/admin/reports/page.tsx` |
| `/admin/settings` | 统计设置 | `app/admin/settings/page.tsx` |

### 6.2 升级页面

| 路由 | 变更 |
|------|------|
| `/admin/dashboard` | 升级为综合仪表盘（新布局和指标） |
| `/admin/traffic` | UI 升级 + 新增指标（跳出率、页面排行、设备/地区分布、来源） |

### 6.3 新增 API

| 方法 | 路由 | 用途 |
|------|------|------|
| GET | `/api/admin/revenue/overview` | 收入概览（MRR/ARR/ARPPU/瀑布图/趋势/方案占比/LTV） |
| GET | `/api/admin/revenue/funnel` | 转化漏斗数据 |
| GET | `/api/admin/revenue/churn` | 流失分析数据 |
| GET | `/api/admin/behavior/activity` | 活跃度数据 |
| GET | `/api/admin/behavior/segments` | 用户分层数据 |
| GET | `/api/admin/behavior/depth` | 对话深度数据 |
| GET | `/api/admin/behavior/experts` | 专家使用数据 |
| GET | `/api/admin/traffic/detail` | 流量详情（含页面排行/设备/地区/来源） |
| POST | `/api/analytics/heartbeat` | 心跳上报 |
| GET | `/api/admin/dashboard/overview` | 综合仪表盘全部数据 |
| GET | `/api/admin/settings` | 获取统计设置 |
| POST | `/api/admin/settings` | 更新统计设置 |
| GET | `/api/cron/daily-stats` | 每日聚合（Cron Job） |
| GET | `/api/cron/session-cleanup` | 会话清理（Cron Job） |
| POST | `/api/admin/reports/generate-pdf` | 生成 PDF 报表 |

### 6.4 保留 API（无变更或微调）

| 路由 | 说明 |
|------|------|
| `/api/admin/users` + `[id]` | 已有，不需要变更 |
| `/api/admin/dashboard` | 已有，可标记 deprecated 或保留为简单版本 |
| `/api/cron/cleanup` | 已有，保留不变 |

---

## 七、数据库变更汇总

### 7.1 新增表

| 表 | 用途 |
|----|------|
| `subscription_events` | 订阅事件溯源 (7 种事件类型) |
| `mrr_snapshots` | MRR 物化缓存 (按日+方案) |
| `sessions` | 用户会话追踪 |
| `analytics_settings` | 统计配置存储 (JSON key-value) |

### 7.2 analytics_events 扩展

- `page_view` 事件的 payload 增加 `anonymous_id` 字段
- 新增事件类型: `heartbeat` (心跳事件，也可记录到 sessions 表)

### 7.3 迁移脚本

- Migration 0007: 创建 subscription_events + mrr_snapshots + sessions + analytics_settings
- Migration 0008: 历史数据回填（已有 subscriptions → subscription_events）
- Migration 0009: 初始 MRR 快照回填

---

## 八、实施顺序

按 A → B → D → C 顺序：

| 阶段 | 内容 | 预计工作量 |
|------|------|-----------|
| A.1 | 数据库: subscription_events + mrr_snapshots 表 | 1 天 |
| A.2 | 数据采集: PayPal Webhook 联动 + anonymous_id | 1 天 |
| A.3 | 查询层: 收入分析 21 指标查询函数 | 1 天 |
| A.4 | 页面: 收入分析页 (3 Tab) | 1 天 |
| A.5 | 历史数据回填脚本 | 0.5 天 |
| B.1 | 数据库: sessions 表 + 心跳 API | 0.5 天 |
| B.2 | 前端心跳: 对话页 10min 心跳 + Providers 设置 | 0.5 天 |
| B.3 | 查询层: 用户行为 16 指标查询函数 | 1 天 |
| B.4 | 页面: 用户行为分析页 (4 Tab) | 1 天 |
| D.1 | 综合仪表盘升级 (新布局 + 实时指标 + 模块概览) | 1.5 天 |
| C.1 | Cron Job: daily-stats + session-cleanup | 0.5 天 |
| C.2 | 实时数据查询策略 (混合模式) | 0.5 天 |
| C.3 | CSV 导出 + PDF 报表生成 | 1 天 |
| C.4 | 报表导出页 + 统计设置页 | 1 天 |
| C.5 | 流量统计页升级 | 0.5 天 |
| **总计** | | **~11.5 天** |

---

## 九、相关文档

- [产品文档](../项目文档/产品文档.md)
- [技术文档](../项目文档/技术文档.md)
- [API 接口设计文档](../项目文档/api接口设计文档.md)
- [数据库文档](../项目文档/数据库文档.md)
- [UI 设计文档](../项目文档/UI设计文档.md)

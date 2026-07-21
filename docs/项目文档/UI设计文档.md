---
最后更新: 2026-07-21
对应 commit: (待提交后更新)
覆盖模块: UI 组件体系 + 页面结构
---

# QFriendly UI 设计文档

## 全局设计

- 深色主题为主，`globals.css` 中定义基础变量
- 响应式布局，移动端适配
- 动画: Framer Motion（入场/过渡/滚动触发）
- 四位 AI 专家（Evan 倾听者 / Liam 引路人 / Noah 建构师 / Adrian 急救专家），深色主题下各以品牌色 + emoji 区分（🟦🟩🟨🟥）
- Markdown 渲染: react-markdown + remark-gfm（AI 回复中的格式化文本）
- 图表: Recharts（管理后台数据可视化）

## 页面结构

| 页面 | 路由 | 说明 |
|------|------|------|
| 落地页 | /[lang] | Hero + 专家介绍 + 案例 + FAQ + Footer |
| 登录 | /[lang]/auth/login | 邮箱密码登录/注册表单 |
| 对话页 | /[lang]/chat | 侧边栏 + 对话区 + 输入框 |
| 专家对话 | /[lang]/chat/[expert] | 指定专家的对话入口 |
| 定价页 | /[lang]/pricing | 三档方案对比 + PayPal 订阅按钮 |
| 设置页 | /[lang]/settings | 用户名/邮箱/密码修改 |
| 法律页面 | /[lang]/terms, /privacy, /refund | 服务条款/隐私/退款 |
| 管理后台 | /admin/* | 仪表盘/用户管理/数据统计 |

## 组件体系

### common（通用）
- `Navbar` — 顶部导航（含语言切换 + 管理入口）
- `Providers` — Better Auth + PayPal SDK Provider 包裹
- `ErrorBoundary` — 错误边界

### landing（落地页）
- `Hero` — 主视觉区（标题 + CTA）
- `ExpertSection` + `ExpertCard` — 四位专家展示卡片
- `CaseStudies` — 使用场景案例
- `Testimonials` — 用户评价
- `TipsSection` — 情感小贴士
- `FAQ` — 常见问题折叠面板
- `Footer` — 底部导航 + 链接

### chat（对话）
- `ChatSidebar` — 对话列表（含新建+切换+删除）
- `ChatHeader` — 对话头部（当前专家信息 + 切换按钮）
- `MessageList` + `MessageBubble` — 消息列表 + 气泡
- `ChatInput` — 消息输入框
- `WelcomeCard` — 新对话欢迎卡片
- `ExpertAvatar` — 专家头像
- `ExpertSwitchPanel` — 专家切换面板

### auth（认证）
- `AuthForm` — 登录/注册表单（email + password）

### pricing（定价）
- `PricingSection` + `PricingCard` — 定价卡片
- `PayPalButton` — PayPal 订阅按钮（含 Plans 配置）

### settings（设置）
- `SettingsPage` — 设置面板（三个表单）

### admin（管理）
- `AdminLayout` — 管理后台布局
- `AdminSidebar` — 侧边导航
- `StatCard` — 统计卡片（仪表盘用）
- `TrendChart` — 趋势折线图
- `DistributionChart` — 分布饼图
- `DataTable` — 通用数据表格 + 分页
- `DateRangePicker` — 日期范围选择
- `ExportButton` — 数据导出按钮
- `StatFilter` — 统计筛选
- `ConfirmDialog` — 确认弹窗
- `UserTable` — 用户列表表格
- `PaymentChart` — 付费数据图表
- `RetentionChart` — 留存率图表
- `TrafficChart` — 流量图表
- `NavbarAdminLink` — 导航栏管理入口
- `AdminRedirect` — 非管理员重定向
### prompts（专家提示词编辑）
- `PromptEditor` — 专家提示词在线编辑器（三层 Tab + 编辑区 + 保存）

## 国际化

所有 UI 文案通过 `next-intl` 管理，翻译文件在 `messages/en.json` 和 `messages/zh.json`。组件通过 `useTranslations()` hook 获取文案，无需硬编码字符串。

## 相关文档

- [产品文档](./产品文档.md)
- [技术文档](./技术文档.md)

# Chat UI/UX 改进设计规格

**日期：** 2026-05-13
**状态：** 已批准
**范围：** AI 对话页全组件 UI/UX 完善，含响应式适配

---

## 概述

基于 ui-ux-pro-max 设计指南，对 Lunara AI 对话页进行全面 UI/UX 改进，涵盖图标系统、触摸交互、响应式布局、无障碍访问。

### 影响组件
- `MessageBubble.tsx` — 消息气泡响应式宽度/字体
- `ChatInput.tsx` — 输入区域触摸目标 + iOS 适配
- `WelcomeCard.tsx` — 图标替换 + 响应式
- `ChatSidebar.tsx` — 删除按钮 + 移动端优化
- `ChatHeader.tsx` — 触摸目标 + 图标
- `ExpertSwitchPanel.tsx` — 图标替换 + 响应式
- `ExpertAvatar` (新) — 可复用专家头像组件

---

## 第 1 节：图标系统替换

**问题：** Emoji (🟦🟩🟨🟥💬) 用作 UI 图标，违反 `no-emoji-icons` 规则。

**方案：**
- 专家头像 → 彩色圆形 + 名字首字母（Evan→E, Liam→L, Noah→N, Adrian→A）
- 建议按钮前缀 → Lucide `MessageCircle` SVG
- 创建可复用的 `ExpertAvatar` 组件（color + letter）
- 保留现有专家颜色体系

**涉及文件：** WelcomeCard.tsx, ExpertSwitchPanel.tsx, 新 ExpertAvatar 组件

---

## 第 2 节：触摸目标与交互

**问题：** 发送/停止按钮 36px < 44px 最低标准；删除按钮仅 hover 显示（移动端无效）。

**方案：**
- 发送/停止按钮 → `min-h-[44px] min-w-[44px]`
- 侧边栏删除按钮 → 移动端始终可见，桌面端 hover 显示
- 所有交互元素添加 `cursor-pointer` + `touch-action: manipulation`
- 输入区域添加 `overscroll-behavior: contain` 防 iOS 误触下拉刷新

**涉及文件：** ChatInput.tsx, ChatSidebar.tsx, ChatHeader.tsx, MessageList.tsx

---

## 第 3 节：响应式消息气泡

| 属性 | 移动 (<768px) | 平板 | 桌面 (≥1024px) |
|------|--------------|------|-----------------|
| 用户气泡 max-w | 85% | 75% | 65% |
| AI 气泡 max-w | 92% | 85% | 75% |
| 字体大小 | text-[15px] | text-[15px] | text-sm |
| 内边距 | px-4 py-2.5 | px-4 py-3 | px-5 py-3 |
| 消息间距 | mb-3 | mb-3 | mb-4 |

**涉及文件：** MessageBubble.tsx

---

## 第 4 节：输入区域

- iOS 底部安全区：`pb-[env(safe-area-inset-bottom,12px)]`
- 移动端内边距收紧：`px-3 sm:px-4`
- 输入框字体 16px 防 iOS 缩放：`text-[16px]`
- 表单圆角响应式：`rounded-[14px] sm:rounded-[18px]`
- gap 响应式：`gap-2 sm:gap-3`
- textarea：`leading-relaxed`、`touch-action: manipulation`

**涉及文件：** ChatInput.tsx

---

## 第 5 节：欢迎卡片

- 头像：彩色圆形 + 首字母（替换 emoji），`h-16 w-16 sm:h-20 sm:w-20`
- 建议按钮图标：💬 → MessageCircle SVG
- 移动端间距收紧：`px-4 py-8 sm:py-12`
- 标题响应式：`text-xl sm:text-2xl`
- 建议按钮文字放宽：`max-w-[280px]`

**涉及文件：** WelcomeCard.tsx

---

## 第 6 节：侧边栏

- 桌面端宽度：`w-72 lg:w-80`
- 删除按钮：移动端始终显示（`opacity-100 md:opacity-0 md:group-hover:opacity-100`）
- 新建按钮图标：`+` → Lucide `Plus` SVG
- 移动端抽屉宽度：`w-[85vw] max-w-[320px]`
- 对话项添加 `cursor-pointer`

**涉及文件：** ChatSidebar.tsx

---

## 第 7 节：Header & Expert Panel

**ChatHeader：**
- 专家切换按钮：`cursor-pointer`、`touch-action: manipulation`
- 汉堡菜单：`min-h-[44px] min-w-[44px]`

**ExpertSwitchPanel：**
- 专家头像：彩色圆形 + 首字母（替换 emoji）
- 移动端面板：`mx-2 p-6 sm:p-8`，`rounded-[24px] sm:rounded-[32px]`
- 添加 `max-h-[80vh] overflow-y-auto` 防止溢出

**涉及文件：** ChatHeader.tsx, ExpertSwitchPanel.tsx

---

## 设计常量（不变）

| Token | 值 |
|-------|-----|
| --color-primary | #FF7A59 |
| --color-background | #FAF7F2 |
| --color-surface | #FFFFFF |
| --color-text-primary | #2B2B2B |
| --color-text-secondary | #777777 |
| 专家 Evan | #4A90D9 |
| 专家 Liam | #5BA88C |
| 专家 Noah | #D4A843 |
| 专家 Adrian | #C45C5C |

## Z-Index 层级

| 层级 | 元素 |
|------|------|
| z-10 | 基础元素 |
| z-20 | 下拉菜单 |
| z-30 | 新消息浮动按钮 |
| z-40 | 移动端侧边栏 |
| z-50 | 专家切换面板 |

## 响应式断点

| 断点 | 宽度 | 目标设备 |
|------|------|----------|
| 默认 (mobile) | <640px | 手机纵向 |
| sm | ≥640px | 手机横向 |
| md | ≥768px | 平板 |
| lg | ≥1024px | 桌面 |

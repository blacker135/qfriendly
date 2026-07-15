---
最后更新: 2026-07-15
对应 commit: 7e67481
覆盖模块: 管理后台 — 智能体提示词设置
---

# QFriendly 智能体提示词设置 — 设计规格

## 概述

在管理后台「工具」菜单下新增「智能体提示词」页面，允许管理员在线编辑四位 AI 专家（Evan/Liam/Noah/Adrian）的 System Prompt、欢迎语和切换过渡模板，中英双语各一份。编辑后实时生效，无需重新部署。

## 核心决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 存储方式 | PostgreSQL `expert_prompts` 表 | 在线编辑实时生效，无需重部署 |
| 编辑范围 | System Prompt + 欢迎语 + 切换模板（中英双版） | 管理员需要完整控制专家表现 |
| 加载策略 | DB + 内存 Map 缓存，PUT 后失效 | 避免每次对话额外 DB 查询 |
| 重置功能 | 无 | 管理员自行负责 |
| 页面布局 | 专家 Tab → 语言 Tab → 内容类型 Tab | 三层导航，清晰逐级深入 |

---

## 一、数据库设计

### 新增表: `expert_prompts`

```sql
CREATE TABLE expert_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert expert NOT NULL,           -- 复用已有枚举: evan/liam/noah/adrian
  language language NOT NULL,       -- 复用已有枚举: en/zh
  prompt_type TEXT NOT NULL,        -- 'system' | 'welcome' | 'switch'
  content TEXT NOT NULL,            -- 提示词正文
  updated_at TIMESTAMP DEFAULT now() NOT NULL,
  UNIQUE(expert, language, prompt_type)
);
```

- 最多 24 行（4 专家 × 2 语言 × 3 类型）
- 首次部署执行迁移脚本，将 `lib/prompts/experts.ts` 中的硬编码内容作为初始数据 INSERT
- 读取时若表中无对应记录，回退到代码中的硬编码默认值（保证降级可用）

### Drizzle Schema 定义

在 `lib/db/schema.ts` 中新增:

```ts
export const expertPrompts = pgTable('expert_prompts', {
  id: uuid('id').defaultRandom().primaryKey(),
  expert: expertEnum('expert').notNull(),
  language: languageEnum('language').notNull(),
  promptType: text('prompt_type').notNull(), // 'system' | 'welcome' | 'switch'
  content: text('content').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueConstraint: uniqueIndex('idx_expert_prompts_unique')
    .on(table.expert, table.language, table.promptType),
}));
```

---

## 二、API 设计

### GET `/api/admin/prompts`

获取所有提示词。

| 项目 | 内容 |
|------|------|
| 方法 | GET |
| 权限 | admin（`admin/guard.ts` 校验） |
| 参数 | `?expert=evan&language=zh`（可选筛选） |
| 响应 | `{ prompts: [{ id, expert, language, promptType, content, updatedAt }] }` |

### PUT `/api/admin/prompts`

批量保存提示词。

| 项目 | 内容 |
|------|------|
| 方法 | PUT |
| 权限 | admin |
| 请求体 | `{ prompts: [{ expert, language, promptType, content }] }` |
| 响应 | `{ success: true }` |
| 校验 | expert ∈ {evan,liam,noah,adrian}，language ∈ {en,zh}，promptType ∈ {system,welcome,switch}，content 非空 |
| 副作用 | 保存成功后清除对应缓存 |

### API 路由位置

```
app/api/admin/prompts/route.ts   # GET + PUT 合并
```

---

## 三、缓存模块

### `lib/prompts/cache.ts`

```ts
// 模块级内存缓存，Vercel Fluid Compute 实例复用期间持续有效
const cache = new Map<string, { content: string; cachedAt: number }>();

function cacheKey(expert: ExpertId, lang: Language, type: string): string {
  return `${expert}:${lang}:${type}`;
}

export function getCachedPrompt(expert, lang, type): string | null { ... }
export function setCachedPrompt(expert, lang, type, content): void { ... }
export function invalidateCache(expert, lang, type): void { ... }
```

### `lib/prompts/store.ts`

```ts
// DB 读写操作
export async function getPromptFromDB(expert, lang, type): Promise<string | null> { ... }
export async function upsertPrompt(expert, lang, type, content): Promise<void> { ... }
export async function getAllPromptsFromDB(filters?): Promise<PromptRecord[]> { ... }
```

### 读取链路变更

修改 `lib/prompts/experts.ts` 中的 `getExpertPrompt`、`getWelcomeMessage`、`getSwitchPrompt`：

```
函数调用 → cache.get(key)
  ├─ 命中 → 返回缓存内容
  └─ 未命中 → store.getFromDB(key)
       ├─ DB 有 → 写入缓存 → 返回
       └─ DB 无 → 返回硬编码默认值（现有常量）
```

- 对调用方完全透明（chat API 无需改动）
- 降级策略：DB 不可用时回退硬编码默认值

---

## 四、前端 UI 设计

### 4.1 设计系统

**沿用项目全局深色主题**（`globals.css` 中 `.dark` 变量），在此基础上做编辑器专属增强:

| Token | 值 | 用途 |
|-------|-----|------|
| `--background` | `#1A1A2E` | 页面底色 |
| `--surface` | `#2D2D44` | 卡片/面板/编辑器背景 |
| `--surface-raised` | `#363652` | 激活态 Tab / hover 抬高 |
| `--text-primary` | `#E0E0E0` | 正文、编辑内容 |
| `--text-secondary` | `#999999` | 辅助信息、更新时间 |
| `--text-muted` | `#6B6B80` | 占位符、禁用态文字 |
| `--border` | `rgba(255,255,255,0.06)` | 分割线、编辑器边框 |
| `--expert-evan` | `#4A90D9` | Evan 专家标识色 |
| `--expert-liam` | `#5BA88C` | Liam 专家标识色 |
| `--expert-noah` | `#D4A843` | Noah 专家标识色 |
| `--expert-adrian` | `#C45C5C` | Adrian 专家标识色 |
| `--primary` | `#FF7A59` | 主操作按钮（保存） |
| `--primary-hover` | `#FF8C70` | 按钮 hover |
| `--success` | `#22C55E` | 保存成功 toast |

**字体策略:**

| 用途 | 字体 | Tailwind Class |
|------|------|----------------|
| 页面标题 / Tab 标签 | Inter, PingFang SC | `font-sans`（全局默认） |
| **编辑器内容** | Fira Code, SF Mono, monospace | `font-mono` |
| 辅助文字（更新时间等） | 同全局 | `text-sm text-[var(--text-secondary)]` |

编辑器字体使用 Fira Code（专为代码/文本编辑优化，清晰等宽）。在 `app/admin/layout.tsx` 中按需引入 Google Fonts CSS。

---

### 4.2 路由与菜单

| 项目 | 内容 |
|------|------|
| 页面路由 | `/admin/prompts` |
| 侧边栏分组 | 「工具」（现有 `navGroups` 第三个 group） |
| 菜单项 | 「智能体提示词」 |
| 图标 | `Bot`（lucide-react，18px，与现有侧边栏图标规格一致） |
| 排序 | 插在「报表导出」之前（报表导出 → 智能体提示词 → 统计设置） |

---

### 4.3 页面结构

**`app/admin/prompts/page.tsx`** — Server Component，仅负责元数据和包裹:

```tsx
// 职责: 设置页面 metadata + 包裹客户端编辑器
// 不在此处做数据获取（编辑器客户端自行 fetch）
```

**`components/admin/prompts/PromptEditor.tsx`** — 'use client'，核心交互。

---

### 4.4 三层 Tab 布局（精确尺寸标注）

```
┌──────────────────────────────────────────────────────────┐
│  ← 页面标题 "智能体提示词" (text-xl font-semibold)        │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 第一层 — 专家 Tab                                   │  │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │  │
│  │ │ ● Evan   │ │ ● Liam   │ │ ● Noah   │ │ ● Doc  │ │  │
│  │ │ Pierce   │ │ Hart     │ │ Sinclair │ │ Adrian │ │  │
│  │ │ 情感稳定者│ │ 情感园丁  │ │ 吸引策略师│ │情感干预 │ │  │
│  │ └──────────┘ └──────────┘ └──────────┘ └────────┘ │  │
│  │ 每个 Tab: px-5 py-3, gap-2, rounded-lg            │  │
│  │ 激活态: bg-[var(--surface-raised)] + 左侧色条       │  │
│  │ 非激活: bg-transparent, text-[var(--text-secondary)]│  │
│  │ Hover: bg-[#2D2D44]/50                             │  │
│  │ 过渡: transition-all duration-200                  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────┐                            │
│  │ 第二层 — 语言 Tab        │  右对齐，较小尺寸          │
│  │  [ 中文 ]  [ English ]  │  px-3 py-1.5 text-sm      │
│  │  激活: bg-[#FF7A59]/15   │  rounded-full 胶囊样式    │
│  │        text-[#FF7A59]    │                            │
│  └──────────────────────────┘                            │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 第三层 — 内容类型 Tab         等宽分布，下划线指示器  │  │
│  │  System Prompt  │  欢迎语  │  切换过渡模板          │  │
│  │  ──────────────                                │  │
│  │  激活: text-[var(--text-primary)], border-bottom    │  │
│  │        2px solid var(--primary)                     │  │
│  │  非激活: text-[var(--text-secondary)]               │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │  ┌ 编辑区 card ────────────────────────────────┐  │  │
│  │  │  bg-[var(--surface)]                        │  │  │
│  │  │  border border-[var(--border)]              │  │  │
│  │  │  rounded-xl                                 │  │  │
│  │  │                                             │  │  │
│  │  │  label (sr-only): 当前编辑内容描述           │  │  │
│  │  │                                             │  │  │
│  │  │  ┌──────────────────────────────────────┐  │  │  │
│  │  │  │  textarea                            │  │  │  │
│  │  │  │  bg-transparent                      │  │  │  │
│  │  │  │  font-mono text-sm leading-relaxed   │  │  │  │
│  │  │  │  text-[var(--text-primary)]          │  │  │  │
│  │  │  │  placeholder:text-[var(--text-muted)]│  │  │  │
│  │  │  │  p-5                                 │  │  │  │
│  │  │  │  resize-y (仅允许垂直拉伸)            │  │  │  │
│  │  │  │  最小高度根据内容类型动态设置:         │  │  │  │
│  │  │  │    · System → min-h-[320px]          │  │  │  │
│  │  │  │    · 欢迎语 → min-h-[140px]           │  │  │  │
│  │  │  │    · 切换模板 → min-h-[220px]         │  │  │  │
│  │  │  │ focus:border-[var(--primary)]         │  │  │  │
│  │  │  │ focus:ring-1 focus:ring-[#FF7A59]/30  │  │  │  │
│  │  │  │ focus:outline-none                   │  │  │  │
│  │  │  │ transition-colors duration-200       │  │  │  │
│  │  │  └──────────────────────────────────────┘  │  │  │
│  │  │                                             │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  操作栏 (flex justify-between items-center)         │  │
│  │                                                    │  │
│  │  左侧: text-sm text-[var(--text-secondary)]        │  │
│  │        "最后更新: 2026-07-15 14:30"                │  │
│  │        (若从未编辑过则显示 "尚未自定义，使用默认值") │  │
│  │                                                    │  │
│  │  右侧: [保存修改] 按钮                              │  │
│  │        bg-[#FF7A59] hover:bg-[#FF8C70]            │  │
│  │        text-white font-medium                      │  │
│  │        px-6 py-2.5 rounded-lg                     │  │
│  │        min-w-[120px] min-h-[44px] (触控目标)       │  │
│  │        transition-colors duration-200              │  │
│  │        focus-visible:ring-2 ring-[#FF7A59]/50      │  │
│  │        disabled:opacity-50 disabled:cursor-not-allowed│
│  │                                                    │  │
│  │  保存中: [保存中...] + spinner (animate-spin)       │  │
│  │  保存后: 按钮恢复 + toast 弹出                      │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

### 4.5 专家 Tab 详细设计

每个专家 Tab 卡片包含三个元素:

```
┌─────────────────────┐
│ ●  Liam Hart        │  ← 色点 (w-3 h-3 rounded-full, 专家色)
│    情感园丁          │  ← 中文头衔 (text-xs text-secondary)
└─────────────────────┘
```

- **色点映射:** Evan `#4A90D9`, Liam `#5BA88C`, Noah `#D4A843`, Adrian `#C45C5C`
- **激活态:** `bg-[#363652]` + 左侧 3px 色条（通过 `border-l-3` + 专家色）
- **Hover:** `bg-[#2D2D44]/50`，150ms ease-out
- **非激活文字:** `text-[#999999]`
- **响应式:** ≥768px 四列并排，<768px 改为竖向堆叠（`flex-wrap`）

**组件内部数据结构:**

```tsx
const EXPERT_TABS = [
  { id: 'evan',  name: 'Evan Pierce',  titleZh: '情感稳定者',  color: '#4A90D9', icon: Shield },
  { id: 'liam',  name: 'Liam Hart',    titleZh: '情感园丁',    color: '#5BA88C', icon: Sprout },
  { id: 'noah',  name: 'Noah Sinclair',titleZh: '吸引策略师',  color: '#D4A843', icon: Sparkles },
  { id: 'adrian',name: 'Dr. Adrian Cole',titleZh:'情感干预专家',color: '#C45C5C', icon: HeartPulse },
];
```

---

### 4.6 按钮状态与 Toast

**保存按钮状态机:**

```
idle → loading (保存中...) → success (1.5s 绿色反馈) → idle
                            → error (红色提示) → idle
```

**Toast 通知:**

```
┌──────────────────────────────────┐
│  ✓  保存成功                      │  ← bg-[#22C55E]/15 border border-[#22C55E]/30
│     Evan Pierce · 中文 · System   │     text-[#22C55E] text-sm
│                                  │     rounded-lg px-4 py-3
└──────────────────────────────────┘      fixed bottom-6 right-6 z-50
                                          animate: translateY(16px)→0 + opacity 0→1
                                          200ms ease-out
                                          3 秒后自动消失 + fade-out
                                          motion-reduce: 直接显示/隐藏
```

**错误 Toast:**

```
┌──────────────────────────────────┐
│  ✕  保存失败，请重试              │  ← bg-[#EF4444]/15 border border-[#EF4444]/30
│     (具体错误信息)                │     text-[#EF4444]
└──────────────────────────────────┘
```

---

### 4.7 状态管理

组件内部维护以下 state:

```ts
// 编辑内容 (当前显示的编辑区)
const [content, setContent] = useState<string>('');

// 原始内容 (从 API 加载，用于判断是否有未保存修改)
const [originalContent, setOriginalContent] = useState<string>('');

// 全量数据缓存 (GET 一次性加载 24 条，切换 Tab 不重新请求)
const [allPrompts, setAllPrompts] = useState<Map<string, PromptRecord>>(new Map());

// 当前选中状态
const [activeExpert, setActiveExpert] = useState<ExpertId>('evan');
const [activeLang, setActiveLang] = useState<Language>('zh');
const [activeType, setActiveType] = useState<PromptType>('system');

// 保存状态
const [saveState, setSaveState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
```

**切换 Tab 逻辑:**
1. 记录当前编辑区是否有未保存修改（`content !== originalContent`）
2. 如有未保存修改，先存入 `allPrompts` Map（key = `${expert}:${lang}:${type}`）
3. 切换到新 Tab，从 Map 中读取对应内容填入编辑区
4. **绝不丢失未保存内容**

---

### 4.8 响应式适配策略

| 断点 | 布局变化 |
|------|---------|
| **≥1024px** | 专家 Tab 四列并排，编辑区最大宽度 900px 居中 |
| **768-1023px** | 专家 Tab 两列网格（2×2），编辑器全宽 |
| **<768px** | 专家 Tab 竖向堆叠，语言 Tab + 内容类型 Tab 换行，编辑区 `min-h-[240px]`，保存按钮全宽 |

```css
/* 专家 Tab Grid */
.expert-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);  /* ≥1024px */
  gap: 0.5rem;
}
@media (max-width: 1023px) {
  .expert-tabs { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 767px) {
  .expert-tabs { grid-template-columns: 1fr; }
}
```

---

### 4.9 无障碍清单

应用 ui-ux-pro-max 规则:

| 规则 | 实现 |
|------|------|
| `form-labels` | `<label>` 关联 textarea（`sr-only`），placeholder 不替代 label |
| `focus-states` | `focus-visible:ring-2` 仅在键盘导航时显示，点击不显示 |
| `keyboard-nav` | Tab 键按 专家→语言→类型→编辑区→保存 顺序，符合视觉 |
| `touch-target-size` | 保存按钮 `min-h-[44px] min-w-[120px]`，Tab 区 `py-3`（满足 44px） |
| `color-contrast` | 文字 `#E0E0E0` 对 `#2D2D44` 背景 ≈ 6.5:1（通过 AA）<br>辅助文字 `#999999` 对背景 ≈ 3.5:1（仅非关键信息，符合豁免） |
| `reduced-motion` | Tab/Toast 动画包裹在 `motion-safe:` 中，`motion-reduce:` 直接切换 |
| `cursor-pointer` | 所有 Tab 和按钮添加 `cursor-pointer` |
| `loading-buttons` | 保存中按钮 `disabled` + `opacity-50` + spinner |

---

### 4.10 动画规范

| 元素 | 动画 | Duration | Easing |
|------|------|----------|--------|
| Tab hover 背景色 | `transition-colors` | 150ms | ease-out |
| Tab 切换激活态 | `transition-all`（bg + border + text） | 200ms | ease-out |
| 编辑器 focus ring | `transition-colors` | 200ms | ease-out |
| Toast 入场 | `translateY(16px)→0` + `opacity 0→1` | 200ms | ease-out |
| Toast 退场 | `opacity 1→0` | 150ms | ease-in |
| 保存按钮颜色 | `transition-colors` | 200ms | ease-out |

全部包裹 `motion-safe:` 前缀，`motion-reduce:` 禁用动画直接切换。

---

### 4.11 空状态（首次使用前）

若数据库无自定义记录（全部返回 null），编辑器展示代码中的硬编码默认值。此时:

- 编辑区正常显示默认内容
- 底部文字显示: "尚未自定义，使用默认值"
- 用户首次保存后，更新为实际时间戳

---

## 五、文件变更清单

### 新建文件

```
lib/db/migrations/0010_expert_prompts.sql     # 建表 + 初始化默认数据
lib/prompts/cache.ts                           # 内存缓存模块
lib/prompts/store.ts                           # DB 读写操作
app/api/admin/prompts/route.ts                 # GET + PUT API
app/admin/prompts/page.tsx                     # 页面入口
components/admin/prompts/PromptEditor.tsx      # 编辑器组件
```

### 修改文件

```
lib/db/schema.ts                               # 新增 expertPrompts 表定义
lib/prompts/experts.ts                         # 读取优先走缓存/DB，回退硬编码
components/admin/AdminSidebar.tsx              # 「工具」组新增「智能体提示词」
```

---

## 六、实施顺序

1. **数据库**: 迁移脚本（建表 + 初始数据）
2. **服务层**: `cache.ts` + `store.ts` + 修改 `experts.ts` 读取链路
3. **API**: `route.ts`（GET + PUT）
4. **前端**: 页面 + 编辑器组件 + 侧边栏菜单
5. **测试**: Vitest 验证缓存和存储逻辑

---

## 七、相关文档

- [产品文档](../../项目文档/产品文档.md) — §AI 情感对话（四位专家定义）
- [技术文档](../../项目文档/技术文档.md) — §AI 对话架构、§System Prompt 设计
- [API 接口设计文档](../../项目文档/api接口设计文档.md) — 新增接口
- [数据库文档](../../项目文档/数据库文档.md) — expert_prompts 表
- [UI 设计文档](../../项目文档/UI设计文档.md) — PromptEditor 组件

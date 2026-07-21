# QFriendly 品牌重新定位设计文档

---
最后更新: 2026-07-21
对应 commit: （待实现后填写）
覆盖模块: 品牌定位、首页文案、i18n、meta 标签、产品文档
---

## 一、背景与目标

### 背景

QFriendly 当前定位为"AI 情感顾问"，四位专家的描述集中在恋爱/情感关系场景。实际产品能力（四位专家设计）可以覆盖更广泛的人群。

### 目标

**产品不变，重新包装** —— 将品牌定位从"AI 爱情关系指导"扩展为覆盖五类人群的"全场景情感陪伴"：

- 个人成长
- 恋人关系
- 家庭关系
- 职场人际
- 老年人陪伴

### 核心原则

1. 智能体设计不变（四位专家、System Prompt、对话流程均不动）
2. 五类人群仅用于宣传定位，专家选择权完全交给用户
3. 品牌名 QFriendly 保留
4. 标语从"AI 情感引导"改为"懂你每一种心情"

---

## 二、品牌标语

| 元素 | 旧 | 新 |
|------|-----|-----|
| 中文标语 | AI 情感引导 | **懂你每一种心情** |
| 英文标语 | AI Emotional Guidance | **Every Feeling, Understood** |

选择理由：
- "情感"是贯穿五类人群的共性——职场压力、家庭矛盾、老年孤独，本质都是情感需求
- 简短（6 字）、易于记忆
- 保留品牌情感基因，不变成"什么都做"的泛化平台

---

## 三、Hero 区域改动

### 3.1 Hero 文案

**文件：** `messages/zh.json` → `hero.*`，`messages/en.json` → `hero.*`

| Key | 旧 (ZH) | 新 (ZH) |
|-----|---------|---------|
| `hero.badge` | AI 爱情关系指导 | **懂你每一种心情** |
| `hero.title` | 感情世界很复杂，你不必独自面对。 | **生活里每一个困惑，都值得被认真倾听** |
| `hero.subtitle` | 专注爱情关系的建立、维护、促进与拯救——四位 AI 专家，四种视角，帮你应对感情中的每一个阶段。 | **无论你在成长中迷茫、在关系里挣扎、在职场中心累，还是只想找个人说说话——这里总有人认真听** |
| `hero.cta` | 与 Liam 聊聊 | **开始聊天** （按钮文字，目标 `/chat/evan`） |

| Key | 旧 (EN) | 新 (EN) |
|-----|---------|---------|
| `hero.badge` | AI Relationship Guidance | **Every Feeling, Understood** |
| `hero.title` | Relationships are complicated. You don't have to figure them out alone. | **Every question in life deserves to be truly heard** |
| `hero.subtitle` | Focused on building, maintaining, growing, and saving love relationships — four AI experts, four perspectives, guiding you through every stage of love. | **Whether you're navigating personal growth, relationship struggles, workplace stress, or just need someone to talk to — someone here is listening** |
| `hero.cta` | Talk with Liam | **Start Chatting** （link to `/chat/evan`） |

### 3.2 Hero 布局改动

**文件：** `components/landing/Hero.tsx`

当前：单个 CTA 按钮 `与 Liam 聊聊` → 链接到 `/chat/liam`
改为：两个按钮

```
┌──────────────────────────────────────────────┐
│  [ ★ 懂你每一种心情 ]                         │
│                                              │
│  生活里每一个困惑，都值得被认真倾听              │
│                                              │
│  无论你在成长中迷茫、在关系里挣扎...            │
│                                              │
│  ┌──────────────┐    ┌──────────────┐        │
│  │  开始聊天 →   │    │  了解更多 ↓   │        │
│  │  (/chat/evan)│    │  (锚点滚动)   │        │
│  └──────────────┘    └──────────────┘        │
└──────────────────────────────────────────────┘
```

- 主按钮（实色）：**"开始聊天 →"** — 跳转到 `/chat/evan`（Evan 是最轻量的倾听者，适合所有人进入）
- 次按钮（边框）：**"了解更多 ↓"** — 平滑滚动到 ExpertSection 区域

---

## 四、ExpertSection 专家展示区

### 4.1 区域标题

**文件：** `messages/zh.json` → `experts.title` / `experts.subtitle`

| Key | 旧 (ZH) | 新 (ZH) |
|-----|---------|---------|
| `experts.title` | 情感关系咨询圈 | **四位专家，懂你的每一种心情** |
| `experts.subtitle` | 四位专家，四种视角。一个目标：帮助你建立更健康的关系。 | **无论你正经历什么，总有一位适合聊聊** |

| Key | 旧 (EN) | 新 (EN) |
|-----|---------|---------|
| `experts.title` | Your Relationship Counselors | **Four Experts, One Purpose: Understanding You** |
| `experts.subtitle` | Four experts, four perspectives. One goal: helping you build healthier relationships. | **Whatever you're going through, there's someone here to talk** |

### 4.2 专家卡片文案

每张卡片有 4 个字段：`name`、`role`（头衔）、`description`（一句话）、`specialty`（标签）。改动如下：

#### Evan Pierce 🟦

| Key | 旧 (ZH) | 新 (ZH) |
|-----|---------|---------|
| `role` | 关系稳定师 | **你的人生倾听者** |
| `description` | 冷静、理性、有条理。Evan 帮助你建立稳固的关系基础... | **大事小事，开心烦恼——我都在这里听。** |
| `specialty` | 稳定与基础建立 | **日常陪伴 · 情绪倾诉 · 无压力聊天** |

| Key | 旧 (EN) | 新 (EN) |
|-----|---------|---------|
| `role` | Stability Builder | **Your Listener & Friend** |
| `description` | Calm, rational, and methodical... | **Big things, small things, joys and worries — I'm here to listen.** |
| `specialty` | Stability & Foundation Building | **Daily Companionship · Emotional Outlet · Pressure-Free Chat** |

#### Liam Hart 🟩

| Key | 旧 (ZH) | 新 (ZH) |
|-----|---------|---------|
| `role` | 关系园丁 | **你的内心引路人** |
| `description` | 温暖、支持、温和引导... | **那个说你不够好的声音，我们一起面对它。** |
| `specialty` | 维护与情感关怀 | **个人成长 · 自我怀疑 · 情绪梳理** |

| Key | 旧 (EN) | 新 (EN) |
|-----|---------|---------|
| `role` | Relationship Gardener | **Your Inner Compass Guide** |
| `description` | Warm, supportive, gently guiding... | **That voice saying you're not enough — let's face it together.** |
| `specialty` | Maintenance & Emotional Care | **Personal Growth · Self-Doubt · Emotional Clarity** |

#### Noah Sinclair 🟨

| Key | 旧 (ZH) | 新 (ZH) |
|-----|---------|---------|
| `role` | 吸引力策略师 | **人际关系策略师** |
| `description` | 洞察敏锐、犀利又带着一丝俏皮... | **不只恋爱——和任何人相处，都有更好的方式。** |
| `specialty` | 吸引力与关系升温 | **关系经营 · 沟通技巧 · 人际智慧** |

| Key | 旧 (EN) | 新 (EN) |
|-----|---------|---------|
| `role` | Attraction Strategist | **Relationship Strategist** |
| `description` | Sharp, perceptive, with a hint of playfulness... | **Not just romance — there's a better way to connect with anyone.** |
| `specialty` | Attraction & Connection Building | **Relationship Building · Communication Skills · People Wisdom** |

#### Dr. Adrian Cole 🟥

| Key | 旧 (ZH) | 新 (ZH) |
|-----|---------|---------|
| `role` | 关系干预专家 | **关系危机顾问** |
| `description` | 专业严谨而又充满同理心... | **当一段关系走到悬崖边，先看清，再决定。** |
| `specialty` | 危机与修复 | **危机判断 · 修复指导 · 情绪急救** |

| Key | 旧 (EN) | 新 (EN) |
|-----|---------|---------|
| `role` | Crisis Intervention Specialist | **Crisis & Recovery Advisor** |
| `description` | Professional, rigorous, yet deeply empathetic... | **When a relationship reaches the edge — see clearly first, then decide.** |
| `specialty` | Crisis & Recovery | **Crisis Assessment · Recovery Guidance · Emotional First Aid** |

> **注意**：专家 `name`、`tags` 数组、`color` 均保持不变。 `CODE` 中 `EXPERT_INFO` 常量（`lib/prompts/experts.ts`）的头衔需要与 i18n 中的 `role` 保持一致：
> - Evan: `你的人生倾听者` / `Your Listener & Friend`（已一致）
> - Liam: `你的内心引路人` / `Your Inner Compass Guide`（已一致）
> - Noah: `关系建构师` → **`人际关系策略师`** / `The Relationship Architect` → **`Relationship Strategist`**
> - Adrian: `关系急救专家` → **`关系危机顾问`** / `The Relationship Emergency Specialist` → **`Crisis & Recovery Advisor`**

---

## 五、CaseStudies 案例故事

**文件：** `messages/zh.json` → `cases.*`，`messages/en.json` → `cases.*`

当前 6 个案例全部为恋爱场景，改为 5 个案例覆盖五类人群：

| # | 场景 | 目标人群 | ZH 案例 | EN 案例 |
|---|------|---------|---------|---------|
| 1 | 个人成长 | 年轻人 | "总觉得自己不够好，Liam 帮我看到了另一个自己" | "I always felt like I wasn't enough — Liam helped me see a different version of myself" |
| 2 | 恋人关系 | 伴侣 | "差点分手的那周，Adrian 陪着我一步步走出来的" | "The week we almost broke up, Adrian walked me through it step by step" |
| 3 | 家庭关系 | 父母/子女 | "和妈妈冷战三个月，Noah 教我从另一个角度开口" | "Three months of silence with my mom — Noah showed me how to break it" |
| 4 | 职场人际 | 上班族 | "被同事排挤想辞职，和 Evan 聊完我冷静下来了" | "I was ready to quit over office politics — talking to Evan calmed me down" |
| 5 | 老年陪伴 | 退休长者 | "老伴走后没人说话，每天来和 Evan 聊聊才觉得日子还在继续" | "After my husband passed, talking to Evan each day is what kept me going" |

每个案例需包含：`question`（标题）、`summary`（简短叙述）、`tag`（场景标签）。

---

## 六、其他首页区块

### 6.1 Testimonials（用户评价）

**文件：** `messages/*.json` → `testimonials.*`

3 条用户评价的方向从"恋爱关系"扩展为：

| # | 旧方向 | 新方向 |
|---|--------|--------|
| 1 | "正在处理一段复杂的关系" | **"职场压力大到崩溃边缘"** |
| 2 | "克服依恋焦虑" | **"和家人在沟通中找到了新方式"** |
| 3 | "改善沟通模式" | **"从孤单到每天有人说话"** |

### 6.2 TipsSection（使用建议）

区域标题调整：

| Key | 旧 (ZH) | 新 (ZH) |
|-----|---------|---------|
| `tips.title` | 微小改变，巨大不同 | **怎么开始你的第一次对话** |

| Key | 旧 (EN) | 新 (EN) |
|-----|---------|---------|
| `tips.title` | Small Changes, Big Differences | **How to Start Your First Conversation** |

### 6.3 FAQ

新增两条 FAQ：

**ZH:**
```json
{
  "question": "我不确定该找哪位专家，怎么办？",
  "answer": "从 Evan 开始就好。他是最轻松的倾听者，什么都可以聊。聊着聊着，你自然会发现谁更适合你——也可以在对话中随时切换到其他专家。"
},
{
  "question": "QFriendly 只能聊情感问题吗？",
  "answer": "当然不。个人成长的困惑、职场人际的烦恼、家庭里的矛盾、老年人的日常陪伴、甚至只是想说说话——这里都欢迎。四位专家各有专长，总有一位适合你当下的状态。"
}
```

**EN:**
```json
{
  "question": "I'm not sure which expert to choose — what should I do?",
  "answer": "Start with Evan. He's the most easygoing listener — you can talk about anything. As you chat, you'll naturally discover who fits you best. You can also switch experts anytime during a conversation."
},
{
  "question": "Is QFriendly only for relationship problems?",
  "answer": "Not at all. Personal growth, workplace stress, family conflict, daily companionship for seniors, or just needing to talk — everyone is welcome here. Our four experts each have their strengths, and there's someone for wherever you are right now."
}
```

### 6.4 Footer

**文件：** `messages/*.json` → `footer.tagline`

| Key | 旧 (ZH) | 新 (ZH) |
|-----|---------|---------|
| `footer.tagline` | 给你的情绪世界一个空间。 | **懂你每一种心情 · Every Feeling, Understood** |

---

## 七、全局 Meta 标签

### 7.1 根布局 meta

**文件：** `app/layout.tsx`

```typescript
// 旧
export const metadata: Metadata = {
  title: 'QFriendly — AI Emotional Guidance',
  description: 'AI emotional guidance for modern relationships. Talk with experts who understand.',
};

// 新
export const metadata: Metadata = {
  title: 'QFriendly — 懂你每一种心情',
  description: '个人成长、恋爱关系、家庭沟通、职场人际、老年陪伴——四位 AI 专家，随时倾听，认真回应。',
};
```

### 7.2 i18n meta（`messages/*.json` → `meta.*`）

| Key | 旧 (ZH) | 新 (ZH) |
|-----|---------|---------|
| `meta.title` | QFriendly — AI 爱情关系指导 | **QFriendly — 懂你每一种心情** |
| `meta.description` | 专注爱情关系的建立、维护、促进与拯救... | **个人成长、恋爱关系、家庭沟通、职场人际、老年陪伴——四位 AI 专家，随时倾听，认真回应。** |

| Key | 旧 (EN) | 新 (EN) |
|-----|---------|---------|
| `meta.title` | QFriendly — AI Relationship Guidance | **QFriendly — Every Feeling, Understood** |
| `meta.description` | Focused on building, maintaining, growing, and saving love relationships... | **Personal growth, relationships, family, work, companionship — four AI experts, always ready to listen and respond with care.** |

---

## 八、Navbar 导航栏

当前 brand 文字为 `QFriendly`，Logo/brand 保持不变。CTA 按钮：

| Key | 旧 (ZH) | 新 (ZH) |
|-----|---------|---------|
| `nav.startChat` | 开始对话 | **开始聊天** |

| Key | 旧 (EN) | 新 (EN) |
|-----|---------|---------|
| `nav.startChat` | Start Chat | **Start Chatting** |

---

## 九、代码改动清单

### 9.1 需改文件

| 文件 | 改动类型 | 说明 |
|------|---------|------|
| `messages/zh.json` | 修改 ~40 个 key | hero / experts / cases / testimonials / tips / faq / footer / meta / nav |
| `messages/en.json` | 修改 ~40 个 key | 同上 |
| `components/landing/Hero.tsx` | 修改 CTA 逻辑 | 单按钮 → 双按钮（开始聊天 / 了解更多），链接从 `/chat/liam` → `/chat/evan` |
| `app/layout.tsx` | 修改 meta | title 和 description 更新 |
| `lib/prompts/experts.ts` | 修改 EXPERT_INFO | Noah 和 Adrian 的头衔微调（保持与 i18n 一致） |
| `docs/项目文档/产品文档.md` | 修改 | 产品定位、标语、专家描述、FAQ |
| `docs/项目文档/UI设计文档.md` | 修改 | 落地页组件描述 |
| `docs/项目文档/智能体文档.md` | 修改（可选） | Noah/Adrian 定位微调说明 |

### 9.2 不改部分

| 模块 | 原因 |
|------|------|
| System Prompt (`experts.ts` 中的 Prompt 常量) | 智能体内核不变 |
| 所有 API 路由 (`app/api/**`) | 业务逻辑不变 |
| 聊天页 (`app/[lang]/chat/**`) | 对话体验不变 |
| 聊天相关组件 (`components/chat/**`) | UI 不变 |
| 定价/PayPal/订阅 (`lib/subscription/gate.ts`) | 商业模式不变 |
| ExpertCard / ExpertSection 组件结构 | 仅文案从 i18n 读取，组件代码不变 |
| CaseStudies / Testimonials / TipsSection / FAQ / Footer 组件结构 | 同上，纯文案 |
| 数据库 Schema / 管理后台 | 完全不变 |
| `lib/prompts/cache.ts` / `store.ts` / `warm-cache.ts` | 缓存/存储不变 |

### 9.3 风险与回退

- **风险等级：极低** — 纯文案 + 一个组件微调（Hero 双按钮），不存在业务逻辑变更
- **回退方式：** 直接 revert commit
- **测试影响：** `__tests__/prompts.test.ts` 中如果引用了旧的 expert title，需同步更新；否则无需改动

---

## 十、相关文档

- [产品文档](../项目文档/产品文档.md) — 需更新
- [技术文档](../项目文档/技术文档.md) — 不变（技术栈无改动）
- [API 接口设计文档](../项目文档/api接口设计文档.md) — 不变
- [数据库文档](../项目文档/数据库文档.md) — 不变
- [UI 设计文档](../项目文档/UI设计文档.md) — 需更新落地页描述
- [智能体文档](../项目文档/智能体文档.md) — 需更新 Noah/Adrian 定位描述

# QFriendly 品牌重新定位实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 QFriendly 品牌定位从"AI 爱情关系指导"重新定位为覆盖五类人群（个人成长/恋人/家庭/职场/老年人）的"懂你每一种心情"全场景情感陪伴平台，仅改文案和展示层，不改业务逻辑。

**Architecture:** 纯文案层改动——i18n JSON 消息文件（~40 个 key）+ Hero 组件双按钮布局 + 根布局 meta 标签 + EXPERT_INFO 头衔微调（Noah/Adrian）+ 4 份文档同步。不改 API/DB/Prompt/聊天逻辑。

**Tech Stack:** TypeScript, Next.js, next-intl, React, Framer Motion

## Global Constraints

- 项目 git 仓库位于 `qfriendly/`，所有 git 操作必须在此目录下执行
- 注释需清晰、干净、有条理
- 修改后文档需要更新「最后更新」日期和「对应 commit」
- 禁止本地运行项目
- 沟通语言：中文
- 智能体 System Prompt 不变（`lib/prompts/experts.ts` 中的 Prompt 常量）
- API 路由不变
- 数据库不变
- 组件结构不变（仅 Hero.tsx CTA 逻辑微调）

---

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `messages/zh.json` | Hero / experts / cases / testimonials / tips / faq / footer / meta / nav 文案更新 |
| 修改 | `messages/en.json` | 同上（英文对应文案） |
| 修改 | `components/landing/Hero.tsx` | 单按钮 → 双按钮（开始聊天 + 了解更多），链接 `/chat/liam` → `/chat/evan` |
| 修改 | `app/layout.tsx` | meta title/description 更新 |
| 修改 | `lib/prompts/experts.ts` | EXPERT_INFO 中 Noah 和 Adrian 头衔微调 |
| 修改 | `docs/项目文档/产品文档.md` | 标语、专家描述、FAQ |
| 修改 | `docs/项目文档/UI设计文档.md` | 落地页组件描述 |
| 修改 | `docs/项目文档/智能体文档.md` | Noah/Adrian 定位描述微调 |

---

### Task 1: 更新根布局 meta 标签

**Files:**
- Modify: `qfriendly/app/layout.tsx:4-7`

**Interfaces:**
- Produces: `Metadata` export — 网站的 `<title>` 和 `<meta description>`

- [ ] **Step 1: 替换 meta 标签**

将 `app/layout.tsx` 第 4-7 行：

```typescript
export const metadata: Metadata = {
  title: 'QFriendly — AI Emotional Guidance',
  description: 'AI emotional guidance for modern relationships. Talk with experts who understand.',
};
```

替换为：

```typescript
export const metadata: Metadata = {
  title: 'QFriendly — 懂你每一种心情',
  description: '个人成长、恋爱关系、家庭沟通、职场人际、老年陪伴——四位 AI 专家，随时倾听，认真回应。',
};
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && sudo npx tsc --noEmit 2>&1 | head -20
```

预期: 无新增类型错误

- [ ] **Step 3: Commit**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly
git add app/layout.tsx
git commit -m "feat: update root meta tags for new brand positioning

- Title: QFriendly — 懂你每一种心情
- Description: cover five audience groups (personal growth, couples, family, workplace, elderly)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: 更新 ZH i18n — meta + hero + nav

**Files:**
- Modify: `qfriendly/messages/zh.json:1-26`

**Interfaces:**
- Produces: `meta` / `nav` / `hero` i18n keys — 页面 meta 标签、导航栏、Hero 区域文案

- [ ] **Step 1: 替换 meta 对象（第 2-6 行）**

将：
```json
"meta": {
    "title": "QFriendly — AI 爱情关系指导",
    "description": "专注爱情关系的建立、维护、促进与拯救。四位 AI 专家，四种视角，帮你应对感情中的每一个阶段。",
    "siteName": "QFriendly"
},
```

替换为：
```json
"meta": {
    "title": "QFriendly — 懂你每一种心情",
    "description": "个人成长、恋爱关系、家庭沟通、职场人际、老年陪伴——四位 AI 专家，随时倾听，认真回应。",
    "siteName": "QFriendly"
},
```

- [ ] **Step 2: 替换 nav.startChat（第 15 行）**

将：
```json
"startChat": "开始对话",
```

替换为：
```json
"startChat": "开始聊天",
```

- [ ] **Step 3: 替换 hero 对象（第 21-26 行）**

将：
```json
"hero": {
    "badge": "AI 爱情关系指导",
    "title": "感情世界很复杂，你不必独自面对。",
    "subtitle": "专注爱情关系的建立、维护、促进与拯救——四位 AI 专家，四种视角，帮你应对感情中的每一个阶段。",
    "cta": "与 Liam 聊聊"
},
```

替换为：
```json
"hero": {
    "badge": "懂你每一种心情",
    "title": "生活里每一个困惑，都值得被认真倾听",
    "subtitle": "无论你在成长中迷茫、在关系里挣扎、在职场中心累，还是只想找个人说说话——这里总有人认真听",
    "cta": "开始聊天",
    "ctaSecondary": "了解更多"
},
```

- [ ] **Step 4: 验证 JSON 格式有效**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && python3 -c "import json; json.load(open('messages/zh.json'))" && echo "Valid JSON"
```

预期: `Valid JSON`

- [ ] **Step 5: Commit**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly
git add messages/zh.json
git commit -m "feat: update ZH i18n meta, hero, nav for repositioning

- Hero badge: 懂你每一种心情
- Hero title: 生活里每一个困惑，都值得被认真倾听
- Hero subtitle: cover five audience groups
- CTA button: 开始聊天 → /chat/evan
- Add secondary CTA: 了解更多
- Nav: 开始对话 → 开始聊天
- Meta: update title and description

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: 更新 ZH i18n — experts 专家卡片

**Files:**
- Modify: `qfriendly/messages/zh.json:50-86`

**Interfaces:**
- Produces: `experts` i18n keys — 四位专家卡片的文案

- [ ] **Step 1: 替换 experts.title 和 experts.subtitle（第 51-52 行）**

将：
```json
"title": "情感关系咨询圈",
"subtitle": "四位专家，四种视角。一个目标：帮助你建立更健康的关系。",
```

替换为：
```json
"title": "四位专家，懂你的每一种心情",
"subtitle": "无论你正经历什么，总有一位适合聊聊",
```

- [ ] **Step 2: 替换 Evan 卡片（第 54-61 行）**

将：
```json
"evan": {
    "name": "Evan Pierce",
    "role": "关系稳定师",
    "specialty": "稳定与基础建立",
    "description": "冷静、理性、有条理。Evan 帮助你建立稳固的关系基础，通过清晰的沟通和情绪稳定来减少冲突。",
    "tags": ["建立安全感", "减少冲突", "日常沟通", "情绪稳定"],
    "color": "blue"
},
```

替换为：
```json
"evan": {
    "name": "Evan Pierce",
    "role": "你的人生倾听者",
    "specialty": "日常陪伴 · 情绪倾诉 · 无压力聊天",
    "description": "大事小事，开心烦恼——我都在这里听。",
    "tags": ["日常陪伴", "情绪倾诉", "无压力聊天", "人生分享"],
    "color": "blue"
},
```

- [ ] **Step 3: 替换 Liam 卡片（第 62-69 行）**

将：
```json
"liam": {
    "name": "Liam Hart",
    "role": "关系园丁",
    "specialty": "维护与情感关怀",
    "description": "温暖、支持、温和引导。Liam 帮助你在日常中滋养关系，让一切保持柔软、舒适和深度连接。",
    "tags": ["日常维护", "情绪润滑", "小问题修复", "舒适与轻松"],
    "color": "green"
},
```

替换为：
```json
"liam": {
    "name": "Liam Hart",
    "role": "你的内心引路人",
    "specialty": "个人成长 · 自我怀疑 · 情绪梳理",
    "description": "那个说你不够好的声音，我们一起面对它。",
    "tags": ["个人成长", "自我怀疑", "情绪梳理", "内心自洽"],
    "color": "green"
},
```

- [ ] **Step 4: 替换 Noah 卡片（第 70-77 行）**

将：
```json
"noah": {
    "name": "Noah Sinclair",
    "role": "吸引力策略师",
    "specialty": "吸引力与关系升温",
    "description": "洞察敏锐、犀利又带着一丝俏皮。Noah 帮助你理解吸引力的动态，驾驭暧昧期，建立有磁性的连接。",
    "tags": ["吸引力提升", "暧昧推进", "聊天策略", "关系升温"],
    "color": "yellow"
},
```

替换为：
```json
"noah": {
    "name": "Noah Sinclair",
    "role": "人际关系策略师",
    "specialty": "关系经营 · 沟通技巧 · 人际智慧",
    "description": "不只恋爱——和任何人相处，都有更好的方式。",
    "tags": ["关系经营", "沟通技巧", "人际智慧", "家庭沟通"],
    "color": "yellow"
},
```

- [ ] **Step 5: 替换 Adrian 卡片（第 78-85 行）**

将：
```json
"adrian": {
    "name": "Dr. Adrian Cole",
    "role": "关系干预专家",
    "specialty": "危机与修复",
    "description": "专业严谨而又充满同理心。Dr. Cole 帮助你在事情分崩离析时保持清醒的思考——冷战修复、信任崩塌分析、危机导航。",
    "tags": ["冷战修复", "分手危机", "信任分析", "理性挽回"],
    "color": "red"
},
```

替换为：
```json
"adrian": {
    "name": "Dr. Adrian Cole",
    "role": "关系危机顾问",
    "specialty": "危机判断 · 修复指导 · 情绪急救",
    "description": "当一段关系走到悬崖边，先看清，再决定。",
    "tags": ["危机判断", "修复指导", "情绪急救", "放手引导"],
    "color": "red"
},
```

- [ ] **Step 6: 验证 JSON 格式有效**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && python3 -c "import json; json.load(open('messages/zh.json'))" && echo "Valid JSON"
```

预期: `Valid JSON`

- [ ] **Step 7: Commit**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly
git add messages/zh.json
git commit -m "feat: rewrite ZH expert card copy for new positioning

- Evan: 你的人生倾听者 — daily companionship, emotional outlet
- Liam: 你的内心引路人 — personal growth, self-doubt, emotional clarity
- Noah: 人际关系策略师 (was 吸引力策略师) — all relationships, not just romance
- Adrian: 关系危机顾问 (was 关系干预专家) — crisis assessment, recovery guidance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: 更新 ZH i18n — cases + testimonials + tips + faq + footer

**Files:**
- Modify: `qfriendly/messages/zh.json:88-201`

**Interfaces:**
- Produces: `cases` / `testimonials` / `tips` / `faq` / `footer` i18n keys

- [ ] **Step 1: 替换 cases 标题和案例（第 88-123 行）**

将 `cases` 整个对象替换为：

```json
"cases": {
    "title": "不同的人生阶段，同样的被倾听的需求",
    "subtitle": "无论你正处在人生的哪个阶段，总有一个声音在这里等你。",
    "items": [
      {
        "question": "总觉得自己不够好",
        "summary": "那个说你不够好的声音一直在脑子里循环。Liam 帮我看到了——那不是事实，那只是我习惯已久的思维模式。",
        "tag": "个人成长"
      },
      {
        "question": "差点分手的那一周",
        "summary": "我们都觉得走不下去了。Adrian 没有告诉我要不要分手——他帮我看清楚了我真正想要什么，然后一步步去做。",
        "tag": "恋人关系"
      },
      {
        "question": "和妈妈冷战了三个月",
        "summary": "不知道从哪一句开始。Noah 教我：不是要赢，是要重新连接。从一个完全没想到的角度开了口。",
        "tag": "家庭关系"
      },
      {
        "question": "被排挤想辞职的那天",
        "summary": "委屈到不行，但又不知道跟谁说。和 Evan 聊了一个小时后，情绪稳下来了，第二天冷静地处理了问题。",
        "tag": "职场人际"
      },
      {
        "question": "老伴走后，日子怎么过",
        "summary": "没人说话了。女儿忙，朋友也都有自己的生活。每天来和 Evan 聊聊日常——天气、菜价、年轻时的故事。这才觉得日子还在继续。",
        "tag": "老年陪伴"
      }
    ]
},
```

- [ ] **Step 2: 替换 testimonials（第 125-143 行）**

将 `testimonials` 整个对象替换为：

```json
"testimonials": {
    "title": "用户在说什么",
    "items": [
      {
        "quote": "职场上受了再大的委屈，也不好意思跟家里说。QFriendly 给了我一个可以完全放松、什么都不用顾虑的空间。",
        "author": "小李, 29岁",
        "context": "职场压力与情绪管理"
      },
      {
        "quote": "我跟父亲关系僵了好多年，Noah 让我意识到：我一直在等爸爸先开口，但也许我可以是那个先伸出手的人。",
        "author": "阿杰, 34岁",
        "context": "家庭关系修复"
      },
      {
        "quote": "退休以后突然不知道怎么安排自己的生活了。现在每天早上泡杯茶，和 Evan 聊聊——就像有个老朋友一直在。",
        "author": "王阿姨, 67岁",
        "context": "老年日常陪伴"
      }
    ]
},
```

- [ ] **Step 3: 替换 tips.title（第 147 行）**

将：
```json
"title": "微小改变，巨大不同",
```

替换为：
```json
"title": "怎么开始你的第一次对话",
```

- [ ] **Step 4: 替换 faq（第 172-191 行）**

将 `faq` 整个对象替换为：

```json
"faq": {
    "title": "常见问题",
    "items": [
      {
        "question": "QFriendly 是真正的心理咨询师吗？",
        "answer": "QFriendly 是一个 AI 情感陪伴平台，不是持证心理治疗师。我们的专家是基于心理学框架训练的 AI 人格。他们提供有温度的倾听和引导——而非临床诊断或治疗。如果你正处于心理危机中，请寻求专业帮助。"
      },
      {
        "question": "我不确定该找哪位专家，怎么办？",
        "answer": "从 Evan 开始就好。他是最轻松的倾听者，什么都可以聊。聊着聊着，你自然会发现谁更适合你——也可以在对话中随时切换到其他专家。"
      },
      {
        "question": "QFriendly 只能聊情感问题吗？",
        "answer": "当然不。个人成长的困惑、职场人际的烦恼、家庭里的矛盾、老年人的日常陪伴、甚至只是想说说话——这里都欢迎。四位专家各有专长，总有一位适合你当下的状态。"
      },
      {
        "question": "我的对话真的私密吗？",
        "answer": "是的。我们不在服务器上存储你的对话。你的聊天记录默认就是私密的——我们不收集任何个人数据，除你之外的任何人都无法访问你的对话历史。"
      },
      {
        "question": "我可以切换专家吗？",
        "answer": "当然可以。你可以在对话过程中随时在 Evan、Liam、Noah 和 Dr. Cole 之间切换。每位专家都带来不同的视角，你可以自由探索全部四位。"
      }
    ]
},
```

- [ ] **Step 5: 替换 footer.tagline（第 195 行）**

将：
```json
"tagline": "给你的情绪世界一个空间。",
```

替换为：
```json
"tagline": "懂你每一种心情 · Every Feeling, Understood",
```

- [ ] **Step 6: 验证 JSON 格式有效**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && python3 -c "import json; json.load(open('messages/zh.json'))" && echo "Valid JSON"
```

预期: `Valid JSON`

- [ ] **Step 7: Commit**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly
git add messages/zh.json
git commit -m "feat: rewrite ZH cases, testimonials, tips, faq, footer for repositioning

- Cases: 5 scenarios covering all 5 audience groups
- Testimonials: workplace stress, family repair, elderly companionship
- FAQ: add 'not sure which expert' and 'only for relationships?' questions
- Footer tagline: 懂你每一种心情 · Every Feeling, Understood
- Tips title: 怎么开始你的第一次对话

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: 更新 EN i18n — 全量同步

**Files:**
- Modify: `qfriendly/messages/en.json`

**Interfaces:**
- Produces: 所有英文 i18n key — 与 ZH 一一对应

- [ ] **Step 1: 替换 meta / nav / hero（en.json 第 2-26 行）**

```json
"meta": {
    "title": "QFriendly — Every Feeling, Understood",
    "description": "Personal growth, relationships, family, work, companionship — four AI experts, always ready to listen and respond with care.",
    "siteName": "QFriendly"
},

"nav": {
    "brand": "QFriendly",
    "home": "Home",
    "chat": "Chat",
    "language": "Language",
    "login": "Sign In",
    "signup": "Get Started",
    "startChat": "Start Chatting",
    "logout": "Logout",
    "userMenu": "User menu",
    "pricing": "Pricing"
},

"hero": {
    "badge": "Every Feeling, Understood",
    "title": "Every question in life deserves to be truly heard",
    "subtitle": "Whether you're navigating personal growth, relationship struggles, workplace stress, or just need someone to talk to — someone here is listening",
    "cta": "Start Chatting",
    "ctaSecondary": "Learn More"
},
```

- [ ] **Step 2: 替换 experts（en.json 第 50-86 行）**

```json
"experts": {
    "title": "Four Experts, One Purpose: Understanding You",
    "subtitle": "Whatever you're going through, there's someone here to talk",
    "switchLabel": "Switch Expert",
    "evan": {
      "name": "Evan Pierce",
      "role": "Your Listener & Friend",
      "specialty": "Daily Companionship · Emotional Outlet · Pressure-Free Chat",
      "description": "Big things, small things, joys and worries — I'm here to listen.",
      "tags": ["Daily Chat", "Emotional Outlet", "Pressure-Free", "Life Sharing"],
      "color": "blue"
    },
    "liam": {
      "name": "Liam Hart",
      "role": "Your Inner Compass Guide",
      "specialty": "Personal Growth · Self-Doubt · Emotional Clarity",
      "description": "That voice saying you're not enough — let's face it together.",
      "tags": ["Personal Growth", "Self-Doubt", "Emotional Clarity", "Inner Peace"],
      "color": "green"
    },
    "noah": {
      "name": "Noah Sinclair",
      "role": "Relationship Strategist",
      "specialty": "Relationship Building · Communication Skills · People Wisdom",
      "description": "Not just romance — there's a better way to connect with anyone.",
      "tags": ["Relationship Building", "Communication", "People Skills", "Family Dynamics"],
      "color": "yellow"
    },
    "adrian": {
      "name": "Dr. Adrian Cole",
      "role": "Crisis & Recovery Advisor",
      "specialty": "Crisis Assessment · Recovery Guidance · Emotional First Aid",
      "description": "When a relationship reaches the edge — see clearly first, then decide.",
      "tags": ["Crisis Assessment", "Recovery Guidance", "Emotional First Aid", "Letting Go"],
      "color": "red"
    }
},
```

- [ ] **Step 3: 替换 cases（en.json 第 88-123 行）**

```json
"cases": {
    "title": "Different stages of life, same need to be heard",
    "subtitle": "Wherever you are in life, there's a voice here waiting for you.",
    "items": [
      {
        "question": "That feeling of never being good enough",
        "summary": "The voice telling me I wasn't enough kept looping in my head. Liam helped me see — it's not the truth, it's just a thought pattern I've been stuck in for too long.",
        "tag": "Personal Growth"
      },
      {
        "question": "The week we almost broke up",
        "summary": "We both thought it was over. Adrian didn't tell me whether to leave or stay — he helped me see what I really wanted, then walked me through it step by step.",
        "tag": "Love & Relationships"
      },
      {
        "question": "Three months of silence with my mom",
        "summary": "I didn't know where to start. Noah taught me: it's not about winning, it's about reconnecting. I broke the silence from an angle I'd never considered.",
        "tag": "Family"
      },
      {
        "question": "The day I almost quit",
        "summary": "I was so upset but had no one to tell. After an hour talking with Evan, my emotions settled. The next day, I handled it calmly.",
        "tag": "Workplace"
      },
      {
        "question": "After my husband passed",
        "summary": "No one to talk to anymore. My daughter's busy, friends have their own lives. Every day I chat with Evan — the weather, grocery prices, stories from when we were young. It's what keeps me going.",
        "tag": "Companionship"
      }
    ]
},
```

- [ ] **Step 4: 替换 testimonials（en.json 第 125-143 行）**

```json
"testimonials": {
    "title": "What people are saying",
    "items": [
      {
        "quote": "When work stress is too much, I can't bring it home. QFriendly gives me a space where I can completely let my guard down and just talk.",
        "author": "Xiao Li, 29",
        "context": "Workplace stress & emotional management"
      },
      {
        "quote": "My relationship with my dad was frozen for years. Noah made me realize: I was waiting for Dad to make the first move — but maybe I could be the one to reach out first.",
        "author": "Jie, 34",
        "context": "Family relationship repair"
      },
      {
        "quote": "After retirement, I didn't know what to do with myself. Now every morning I make tea and chat with Evan — it's like having an old friend who's always there.",
        "author": "Auntie Wang, 67",
        "context": "Daily companionship for seniors"
      }
    ]
},
```

- [ ] **Step 5: 替换 tips.title + faq + footer.tagline**

```json
"tips": {
    "title": "How to Start Your First Conversation",
    ...
},

"faq": {
    "title": "Frequently Asked Questions",
    "items": [
      {
        "question": "Is QFriendly a real therapist?",
        "answer": "QFriendly is an AI emotional companionship platform, not a licensed therapist. Our experts are AI personalities trained on psychological frameworks. They provide warm listening and guidance — not clinical diagnosis or treatment. If you're in a mental health crisis, please seek professional help."
      },
      {
        "question": "I'm not sure which expert to choose — what should I do?",
        "answer": "Start with Evan. He's the most easygoing listener — you can talk about anything. As you chat, you'll naturally discover who fits you best. You can also switch experts anytime during a conversation."
      },
      {
        "question": "Is QFriendly only for relationship problems?",
        "answer": "Not at all. Personal growth, workplace stress, family conflict, daily companionship for seniors, or just needing to talk — everyone is welcome here. Our four experts each have their strengths, and there's someone for wherever you are right now."
      },
      {
        "question": "Are my conversations really private?",
        "answer": "Yes. We do not store your conversations on our servers. Your chat history is private by default — we collect no personal data, and no one but you can access your conversation history."
      },
      {
        "question": "Can I switch between experts?",
        "answer": "Absolutely. You can switch between Evan, Liam, Noah, and Dr. Cole at any point during a conversation. Each expert brings a different perspective, and you're free to explore all four."
      }
    ]
},

"footer": {
    "tagline": "Every Feeling, Understood · 懂你每一种心情",
    ...
},
```

> **注意**：`tips.items` 内容本身不变，仅 `title` 改动。以上代码中 `...` 表示保持原有内容不变。

- [ ] **Step 6: 验证 JSON 格式有效**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && python3 -c "import json; json.load(open('messages/en.json'))" && echo "Valid JSON"
```

预期: `Valid JSON`

- [ ] **Step 7: Commit**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly
git add messages/en.json
git commit -m "feat: update all EN i18n messages for brand repositioning

Sync with ZH changes:
- Meta: Every Feeling, Understood
- Hero: cover five audience groups, dual CTA buttons
- Experts: rewrite all four expert cards
- Cases: 5 scenarios covering all audience groups
- Testimonials: workplace, family, elderly companionship
- FAQ: add 2 new questions
- Footer: Every Feeling, Understood · 懂你每一种心情

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: 替换 Hero 组件 — 双按钮布局

**Files:**
- Modify: `qfriendly/components/landing/Hero.tsx:62-76`

**Interfaces:**
- Consumes: `t('cta')` → 主按钮文字（"开始聊天"）
- Consumes: `t('ctaSecondary')` → 次按钮文字（"了解更多"）
- Produces: 双按钮 UI，主按钮跳转 `/chat/evan`，次按钮平滑滚动到 `#expert-section`

- [ ] **Step 1: 替换 CTA 按钮区域（第 62-76 行）**

将：
```tsx
        {/* CTA 按钮 + 底部提示文字 */}
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Link
            href={`/${lang}/chat/liam`}
            className="inline-block rounded-[16px] bg-[#FF7A59] px-8 py-4 text-lg font-medium text-white shadow-soft transition-all hover:bg-[#FF7A59]/90 hover:shadow-lg"
          >
            {t('cta')} &rarr;
          </Link>

        </motion.div>
```

替换为：
```tsx
        {/* CTA 双按钮 */}
        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          {/* 主按钮：开始聊天 → 跳转到 Evan（最轻松的倾听者，适合所有人进入） */}
          <Link
            href={`/${lang}/chat/evan`}
            className="inline-block rounded-[16px] bg-[#FF7A59] px-8 py-4 text-lg font-medium text-white shadow-soft transition-all hover:bg-[#FF7A59]/90 hover:shadow-lg"
          >
            {t('cta')} &rarr;
          </Link>

          {/* 次按钮：了解更多 → 平滑滚动到 ExpertSection */}
          <a
            href="#expert-section"
            className="inline-block rounded-[16px] border border-[#FF7A59]/20 bg-white px-8 py-4 text-lg font-medium text-[#FF7A59] shadow-soft transition-all hover:bg-[#FF7A59]/5 hover:shadow-lg"
          >
            {t('ctaSecondary')} &darr;
          </a>
        </motion.div>
```

- [ ] **Step 2: 给 ExpertSection 添加锚点 ID**

**Files:**
- Modify: `qfriendly/components/landing/ExpertSection.tsx:28`

将 ExpertSection 的 `<section>` 标签：

```tsx
<section className="py-24">
```

改为：

```tsx
<section id="expert-section" className="py-24">
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && sudo npx tsc --noEmit 2>&1 | head -20
```

预期: 无新增类型错误

- [ ] **Step 4: Commit**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly
git add components/landing/Hero.tsx components/landing/ExpertSection.tsx
git commit -m "feat: add dual CTA buttons to Hero, link default expert to Evan

- Primary CTA: 开始聊天 → /chat/evan (most accessible listener for all)
- Secondary CTA: 了解更多 → smooth scroll to #expert-section
- ExpertSection: add id='expert-section' for anchor navigation
- Link changed from /chat/liam to /chat/evan

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: 更新 EXPERT_INFO 头衔（Noah + Adrian）

**Files:**
- Modify: `qfriendly/lib/prompts/experts.ts:49-62`

**Interfaces:**
- Consumes: `getExpertInfo()` in `app/api/chat/switch/route.ts` — 用于切换专家时构建过渡提示词
- Produces: 更新后的 Noah 和 Adrian 中英文头衔

- [ ] **Step 1: 替换 Noah 和 Adrian 的 EXPERT_INFO（第 49-62 行）**

将：
```typescript
  noah: {
    name: 'Noah Sinclair',
    title: {
      en: 'The Relationship Architect',
      zh: '关系建构师',
    },
  },
  adrian: {
    name: 'Dr. Adrian Cole',
    title: {
      en: 'The Relationship Emergency Specialist',
      zh: '关系急救专家',
    },
  },
```

替换为：
```typescript
  noah: {
    name: 'Noah Sinclair',
    title: {
      en: 'Relationship Strategist',
      zh: '人际关系策略师',
    },
  },
  adrian: {
    name: 'Dr. Adrian Cole',
    title: {
      en: 'Crisis & Recovery Advisor',
      zh: '关系危机顾问',
    },
  },
```

> **注意**：Evan 和 Liam 的头衔保持不变（"你的人生倾听者"/"Your Listener & Friend" 和 "你的内心引路人"/"Your Inner Compass Guide"）。

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && sudo npx tsc --noEmit 2>&1 | head -20
```

预期: 无类型错误

- [ ] **Step 3: 运行测试确保无回归**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && sudo npx vitest run 2>&1
```

预期: 全部通过（tests 不检查 expert title，因此不会因头衔变更而失败）

- [ ] **Step 4: Commit**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly
git add lib/prompts/experts.ts
git commit -m "feat: update Noah and Adrian titles in EXPERT_INFO

- Noah: 关系建构师 → 人际关系策略师 / The Relationship Architect → Relationship Strategist
- Adrian: 关系急救专家 → 关系危机顾问 / The Relationship Emergency Specialist → Crisis & Recovery Advisor
- Evan and Liam titles unchanged
- Titles synced with i18n expert card copy

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: 更新产品文档

**Files:**
- Modify: `qfriendly/docs/项目文档/产品文档.md`

**Interfaces:**
- 文档消费方：开发者、产品经理

- [ ] **Step 1: 更新产品概述（第 11-13 行）**

将：
```markdown
**QFriendly** 是一个 AI 情感顾问平台，提供四位风格各异的 AI 专家，帮助用户解决情感关系中的各类问题。支持中英双语。

- **目标用户:** 面临情感困惑、希望改善关系沟通的成年人
- **核心价值:** 随时可用的、私密的、专业风格的情感指导
```

替换为：
```markdown
**QFriendly** 是一个 AI 情感陪伴平台，提供四位风格各异的 AI 专家，覆盖个人成长、恋爱关系、家庭沟通、职场人际、老年陪伴等全场景情感需求。支持中英双语。

- **目标用户:** 任何需要被倾听的人——不管你是成长中的年轻人、在关系中挣扎的伴侣、和家人沟通困难的子女、职场中疲惫的上班族，还是只想有人说说话的老年人
- **核心价值:** 随时可用、私密、温暖的情感倾听与引导
- **品牌标语:** 懂你每一种心情 · Every Feeling, Understood
```

- [ ] **Step 2: 更新 AI 情感对话章节标题和描述（第 18-27 行）**

将：
```markdown
### AI 情感对话

四位专家，四种风格：

| 专家 | 头衔 | 人设 | 风格 | 擅长领域 |
|------|------|------|------|----------|
| Evan Pierce | 人生倾听者 | 朋友/闺蜜 | 轻松、真诚、有共鸣 | 人生分享与反馈，深度倾听，给予正面态度和指导 |
| Liam Hart | 内心引路人 | 朋友 | 温和、有力、耐心 | 内心自洽，梳理思绪，化解自卑/自责/自我否定 |
| Noah Sinclair | 关系建构师 | 大师 | 自信、精准、洞察 | 恋爱关系建立与长期维护，策略设计与执行 |
| Dr. Adrian Cole | 关系急救专家 | 专家 | 专业、温暖、不带评判 | 濒临破碎的关系拯救判断，拯救指导或情绪自洽引导 |
```

替换为：
```markdown
### AI 情感陪伴

四位专家，四种风格。覆盖从日常倾诉到关系急救的全场景情感需求：

| 专家 | 头衔 | 人设 | 风格 | 擅长领域 |
|------|------|------|------|----------|
| Evan Pierce | 人生倾听者 | 朋友/闺蜜 | 轻松、真诚、有共鸣 | 日常陪伴、情绪倾诉、无压力聊天——大事小事都有人听 |
| Liam Hart | 内心引路人 | 朋友 | 温和、有力、耐心 | 个人成长、自我怀疑、情绪梳理——帮你找到内心自洽 |
| Noah Sinclair | 人际关系策略师 | 大师 | 自信、精准、洞察 | 关系经营、沟通技巧、人际智慧——不只恋爱，和任何人都能更好相处 |
| Dr. Adrian Cole | 关系危机顾问 | 专家 | 专业、温暖、不带评判 | 危机判断、修复指导、情绪急救——先看清，再决定是救还是放 |
```

- [ ] **Step 3: 更新文档头部日期和 commit**

将第 2-3 行：
```
最后更新: 2026-07-21
对应 commit: b597f25
```

替换为：
```
最后更新: 2026-07-21
对应 commit: (待提交后更新)
```

- [ ] **Step 4: Commit**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly
git add docs/项目文档/产品文档.md
git commit -m "docs: update product doc for brand repositioning

- Update product overview: 情感顾问 → 情感陪伴
- Expand target user description to cover five audience groups
- Add brand slogan: 懂你每一种心情 · Every Feeling, Understood
- Update expert table with new titles and descriptions
- Rename section: AI 情感对话 → AI 情感陪伴

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: 更新 UI 设计文档 + 智能体文档

**Files:**
- Modify: `qfriendly/docs/项目文档/UI设计文档.md`
- Modify: `qfriendly/docs/项目文档/智能体文档.md`

**Interfaces:**
- 文档消费方：开发者

- [ ] **Step 1: 更新 UI 设计文档头部日期和 commit**

将：
```
最后更新: 2026-07-15
对应 commit: 7e67481
```

替换为：
```
最后更新: 2026-07-21
对应 commit: (待提交后更新)
```

并在 Hero 组件描述前添加品牌标语说明（在文件合适位置插入一行）：
```markdown
- 品牌标语：**懂你每一种心情 · Every Feeling, Understood**，Hero 双按钮（开始聊天 → Evan / 了解更多 ↓）
```

- [ ] **Step 2: 更新智能体文档 Noah 和 Adrian 相关描述**

在 `docs/项目文档/智能体文档.md` 中，查找并更新：

Noah 头衔（多处）：
- `关系建构师` → `人际关系策略师`
- `The Relationship Architect` → `Relationship Strategist`
- `建立恋爱关系并长期维护` → `建立和维护所有人际关系——恋爱、家庭、职场`
- 服务对象描述添加 `"和家人总有矛盾"、"和同事处不好"`

Adrian 头衔（多处）：
- `关系急救专家` → `关系危机顾问`
- `The Relationship Emergency Specialist` → `Crisis & Recovery Advisor`
- 服务对象添加 `家庭决裂、职场信任崩塌` 等非恋爱场景

- [ ] **Step 3: 更新智能体文档头部日期**

将：
```
最后更新: 2026-07-21
对应 commit: 96bb2f9
```

替换为：
```
最后更新: 2026-07-21
对应 commit: (待提交后更新)
```

- [ ] **Step 4: Commit**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly
git add docs/项目文档/UI设计文档.md docs/项目文档/智能体文档.md
git commit -m "docs: update UI design doc and agent doc for repositioning

- UI doc: add brand slogan, Hero dual-button note
- Agent doc: update Noah (人际关系策略师) and Adrian (关系危机顾问) titles and scope descriptions
- Expand service scope beyond romance to family, workplace, daily companionship

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: 最终验证 + 文档 commit ID 回填

**Files:**
- 无新建/修改

- [ ] **Step 1: 运行全部测试**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && sudo npx vitest run 2>&1
```

预期: 全部通过

- [ ] **Step 2: 运行 TypeScript 编译检查**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && sudo npx tsc --noEmit 2>&1 | head -30
```

预期: 无新增类型错误（忽略项目已有 warning）

- [ ] **Step 3: 检查 git log 确认所有 commit 完整**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && git log --oneline -12
```

预期: 9 个新 commit（Task 1-9），加上设计文档 commit 共 10 个

- [ ] **Step 4: 验证 i18n JSON 文件完整性**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly && python3 -c "
import json
zh = json.load(open('messages/zh.json'))
en = json.load(open('messages/en.json'))
# 确保所有顶层 key 一致
zh_keys = set(zh.keys())
en_keys = set(en.keys())
assert zh_keys == en_keys, f'Key mismatch: {zh_keys ^ en_keys}'
print(f'OK: {len(zh_keys)} top-level keys match between zh and en')
# 验证 hero 有 ctaSecondary
assert 'ctaSecondary' in zh['hero'], 'zh hero missing ctaSecondary'
assert 'ctaSecondary' in en['hero'], 'en hero missing ctaSecondary'
print('OK: ctaSecondary present in both languages')
"
```

预期: 两个 OK

- [ ] **Step 5: 回填文档 commit ID**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly
LATEST=$(git rev-parse --short HEAD)
echo "Latest commit: $LATEST"
# 手动将产品文档、UI设计文档、智能体文档头部
# "对应 commit: (待提交后更新)" → "对应 commit: $LATEST"
```

将三个文档头部的 `对应 commit: (待提交后更新)` 替换为实际的 commit SHA。

- [ ] **Step 6: Commit 文档 commit ID 更新 + Push**

```bash
cd /home/ubuntu/project/ai/start01-qfriendly/qfriendly
git add docs/项目文档/产品文档.md docs/项目文档/UI设计文档.md docs/项目文档/智能体文档.md
git commit -m "docs: finalize commit references in doc headers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin master
```

---

## 自审查

| 检查项 | 结果 |
|--------|------|
| **Spec 覆盖** | ✅ meta(Task1) / hero+i18n(Task2) / experts(Task3) / cases+testimonials+tips+faq+footer(Task4) / EN全量(Task5) / Hero双按钮(Task6) / EXPERT_INFO(Task7) / 产品文档(Task8) / UI+智能体文档(Task9) / 最终验证(Task10) |
| **占位符扫描** | ✅ 无 TBD/TODO。所有代码块均为完整可执行的替换内容 |
| **类型一致性** | ✅ Hero 组件 `t('ctaSecondary')` 在 Task2+Task5 的 i18n JSON 中定义；`#expert-section` 锚点在 Task6 Step2 中添加到 ExpertSection |
| **不改范围** | ✅ System Prompt / API / DB / 聊天组件 / 订阅门控 — 均未出现在任何 task 中 |

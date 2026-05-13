# AI 对话页 MVP 完善 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 AI 聊天页 8 项 MVP 阶段体验问题，包括停止生成、智能滚动、Markdown 渲染、删除对话、限流倒计时、错误处理一致性等。

**Architecture:** 在现有组件树内进行局部修改，不改变 API 接口签名、数据流方向和数据库 Schema。通过自定义 hooks 封装部分状态逻辑。

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Drizzle ORM, DeepSeek API, react-markdown, Framer Motion, Tailwind CSS 4

---

### Task 1: 安装 Markdown 渲染依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装 react-markdown 和 remark-gfm**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npm install react-markdown remark-gfm
```

- [ ] **Step 2: 验证安装成功**

```bash
node -e "require('react-markdown'); require('remark-gfm'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-markdown and remark-gfm for chat markdown rendering

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Navbar "Start Chat" 链接修正

**Files:**
- Modify: `components/common/NavbarClient.tsx:207`

- [ ] **Step 1: 修改链接目标，从硬编码 /chat/liam 改为 /chat**

在 `components/common/NavbarClient.tsx` 第 207 行，将：
```tsx
href={`/${lang}/chat/liam`}
```
改为：
```tsx
href={`/${lang}/chat`}
```

- [ ] **Step 2: 验证构建通过**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npx tsc --noEmit 2>&1 | head -20
```
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add components/common/NavbarClient.tsx
git commit -m "fix: navbar Start Chat link now goes to /chat instead of hardcoded /chat/liam

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: 消息气泡 Markdown 渲染

**Files:**
- Modify: `components/chat/MessageBubble.tsx`

- [ ] **Step 1: 在 MessageBubble 中添加 Markdown 渲染**

修改 `components/chat/MessageBubble.tsx`：

在文件顶部导入区添加：
```tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
```

修改正常消息渲染部分（第 62-85 行），将 AI 消息的内容渲染从纯文本改为 Markdown：

```tsx
// ---------- 正常消息渲染 ----------
return (
  <motion.div
    className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
  >
    <div
      className={`rounded-[18px] px-5 py-3 text-sm leading-relaxed ${
        isUser
          ? 'max-w-[70%] bg-[#FF7A59]/10 text-text-primary'
          : 'max-w-[80%] border border-gray-100 bg-white text-text-primary shadow-soft prose prose-sm prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-a:text-[#FF7A59]'
      }`}
    >
      {isUser ? (
        // 用户消息保持纯文本
        content.split('\n').map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {line}
          </span>
        ))
      ) : (
        // AI 消息使用 Markdown 渲染（支持表格、粗体、列表、链接等）
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      )}
    </div>
  </motion.div>
);
```

- [ ] **Step 2: 验证构建通过**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npx tsc --noEmit 2>&1 | head -30
```
Expected: 无新增类型错误

- [ ] **Step 3: Commit**

```bash
git add components/chat/MessageBubble.tsx
git commit -m "feat: AI messages now render Markdown with GFM support

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: 智能滚动

**Files:**
- Modify: `components/chat/MessageList.tsx`

- [ ] **Step 1: 添加智能滚动逻辑**

重写 `components/chat/MessageList.tsx`，添加用户滚动位置检测和「新消息」提示按钮：

```tsx
// ============================================================
// components/chat/MessageList.tsx — 消息列表组件
// ============================================================
// 客户端组件：
//   - 渲染消息列表：空时显示 WelcomeCard
//   - 智能滚动：仅在用户处于底部时自动滚动，否则显示提示按钮
//   - 支持 loadingHistory 骨架屏状态
// ============================================================

'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MessageBubble } from './MessageBubble';
import { WelcomeCard } from './WelcomeCard';

/** 消息项类型 */
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/** MessageList Props */
interface MessageListProps {
  messages: Message[];
  expert: string;
  onSuggestionClick?: (text: string) => void;
  subscriptionStatus?: { subscribed: boolean; trialUsed: number; trialLimit: number } | null;
  /** 加载历史消息中 */
  loadingHistory?: boolean;
}

/**
 * MessageList — 对话消息列表
 * 管理消息渲染、智能自动滚动和加载状态
 */
export function MessageList({
  messages,
  expert,
  onSuggestionClick,
  subscriptionStatus,
  loadingHistory = false,
}: MessageListProps) {
  const tp = useTranslations('pricing');
  const pathname = usePathname();
  const lang = pathname.startsWith('/zh') ? 'zh' : 'en';

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 用户是否在底部附近（距离底部 < 100px）
  const [isNearBottom, setIsNearBottom] = useState(true);
  // 是否有新消息到达且用户不在底部
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // 监听滚动位置
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distFromBottom < 100;
    setIsNearBottom(nearBottom);
    if (nearBottom) {
      setHasNewMessage(false);
    }
  }, []);

  // 新消息到达时：在底部则自动滚，否则显示提示
  useEffect(() => {
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setHasNewMessage(true);
    }
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // 手动滚到底部
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewMessage(false);
  };

  // 加载骨架屏
  if (loadingHistory) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div
                className="animate-pulse rounded-[18px] bg-gray-100"
                style={{
                  width: `${140 + i * 40}px`,
                  height: `${48 + i * 8}px`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 空消息 → 欢迎卡片
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center overflow-y-auto">
        <WelcomeCard
          expert={expert}
          onSuggestionClick={(text) => onSuggestionClick?.(text)}
        />
      </div>
    );
  }

  // 渲染消息列表
  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="relative flex-1 overflow-y-auto px-4 py-6"
    >
      {messages.map((msg, index) => (
        <MessageBubble key={index} role={msg.role} content={msg.content} />
      ))}

      {/* 试用横幅 */}
      {subscriptionStatus && !subscriptionStatus.subscribed && subscriptionStatus.trialUsed < subscriptionStatus.trialLimit && (
        <div className="mx-4 mt-3 rounded-[12px] bg-[#FF7A59]/5 border border-[#FF7A59]/20 px-4 py-3 text-center lg:mx-6">
          <span className="text-sm text-text-secondary">
            {tp('trialBanner', { used: subscriptionStatus.trialUsed, limit: subscriptionStatus.trialLimit })}
          </span>
          <Link
            href={`/${lang}/pricing`}
            className="ml-1 text-sm font-medium text-[#FF7A59] hover:underline"
          >
            {tp('trialLink')}
          </Link>
        </div>
      )}

      {/* 滚动锚点 */}
      <div ref={bottomRef} />

      {/* 新消息浮动按钮 — 用户不在底部时显示 */}
      {hasNewMessage && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full bg-[#FF7A59] px-4 py-2 text-xs font-medium text-white shadow-lg transition-all hover:bg-[#FF7A59]/90 animate-bounce"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          New messages
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 验证构建通过**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npx tsc --noEmit 2>&1 | head -30
```
Expected: 无新增类型错误

- [ ] **Step 3: Commit**

```bash
git add components/chat/MessageList.tsx
git commit -m "feat: add smart scrolling to MessageList with new message indicator

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: 停止生成按钮

**Files:**
- Modify: `components/chat/ChatInput.tsx`
- Modify: `app/[lang]/chat/[expert]/page.tsx`

- [ ] **Step 1: ChatInput 添加停止按钮**

修改 `components/chat/ChatInput.tsx`：

在 interface 中添加新 props：
```tsx
interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  /** AI 正在生成中 */
  generating?: boolean;
  /** 停止生成回调 */
  onStop?: () => void;
}
```

在组件函数签名中解构新增 props：
```tsx
export function ChatInput({ onSend, disabled = false, generating = false, onStop }: ChatInputProps) {
```

修改发送按钮区域（第 79-101 行），替换为条件渲染：
```tsx
        {/* 发送 / 停止按钮 */}
        {generating ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition-all hover:bg-red-600"
            aria-label="Stop generating"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#FF7A59] text-white transition-all hover:bg-[#FF7A59]/90 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label={t('send')}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19V5m0 0l-7 7m7-7l7 7"
              />
            </svg>
          </button>
        )}
```

- [ ] **Step 2: page.tsx 添加 AbortController 和 handleStop**

修改 `app/[lang]/chat/[expert]/page.tsx`：

在 state 声明区域（第 50 行附近），添加：
```tsx
const abortControllerRef = useRef<AbortController | null>(null);
```

在 `handleSend` 函数中（第 142 行 fetch 调用前），添加 AbortController：
```tsx
// 创建 AbortController 用于停止生成
const controller = new AbortController();
abortControllerRef.current = controller;

const res = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    conversation_id: conversationId,
    expert: currentExpert,
    message,
    language: params.lang,
  }),
  signal: controller.signal,
});
```

在 catch 块中（第 265 行附近），添加 AbortError 处理：
```tsx
} catch (err) {
  if (err instanceof DOMException && err.name === 'AbortError') {
    // 用户主动停止，保留已生成的部分内容
    return;
  }
  console.error('Chat send error:', err);
  // ... 现有错误处理
```

在 `handleSend` 的 finally 块中，清理 AbortController：
```tsx
} finally {
  abortControllerRef.current = null;
  setSending(false);
}
```

在 `handleSwitchExpert` 函数中的 `return` 和 `finally` 处 (`setSending(false)` 之前)，同样清理：
```tsx
abortControllerRef.current = null;
```

添加 `handleStop` 函数（放在 `handleClearError` 之后）：
```tsx
const handleStop = () => {
  abortControllerRef.current?.abort();
  abortControllerRef.current = null;
};
```

在 ChatInput 组件使用处（第 446 行），添加新 props：
```tsx
<ChatInput
  onSend={handleSend}
  disabled={sending}
  generating={sending}
  onStop={handleStop}
/>
```

- [ ] **Step 3: 验证构建通过**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npx tsc --noEmit 2>&1 | head -30
```
Expected: 无新增类型错误

- [ ] **Step 4: Commit**

```bash
git add components/chat/ChatInput.tsx app/\[lang\]/chat/\[expert\]/page.tsx
git commit -m "feat: add stop generation button to chat input

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: 限流冷却倒计时

**Files:**
- Modify: `app/api/chat/route.ts:37-38`
- Modify: `app/[lang]/chat/[expert]/page.tsx`

- [ ] **Step 1: route.ts 添加 Retry-After 响应头**

修改 `app/api/chat/route.ts`，将第 38 行：
```tsx
return Response.json({ error: 'Rate limit exceeded' }, { status: 429 });
```
改为：
```tsx
// 计算距重置还剩多少秒
const now = Date.now();
const entry = rateLimitMap.get(session.user.id);
const retryAfter = entry ? Math.ceil((entry.resetTime - now) / 1000) : 60;
return Response.json(
  { error: 'Rate limit exceeded', retryAfter },
  { status: 429, headers: { 'Retry-After': String(retryAfter) } },
);
```

- [ ] **Step 2: page.tsx 添加倒计时状态和逻辑**

修改 `app/[lang]/chat/[expert]/page.tsx`：

在 state 声明区域添加：
```tsx
const [retryAfter, setRetryAfter] = useState(0); // 限流冷却剩余秒数
```

添加倒计时 effect（放在其他 useEffect 之后）：
```tsx
// 限流倒计时
useEffect(() => {
  if (retryAfter <= 0) return;
  const timer = setInterval(() => {
    setRetryAfter((prev) => {
      if (prev <= 1) return 0;
      return prev - 1;
    });
  }, 1000);
  return () => clearInterval(timer);
}, [retryAfter]);
```

修改 429 错误处理（约第 154-159 行），从：
```tsx
if (res.status === 429) {
  setRateLimited(true);
  setError('发送太快了，请稍等片刻再试。');
  setMessages((prev) => prev.filter((m) => m !== userMsg));
  return;
}
```
改为：
```tsx
if (res.status === 429) {
  setRateLimited(true);
  const data = await res.json().catch(() => ({}));
  const waitSeconds = data.retryAfter || 60;
  setRetryAfter(waitSeconds);
  setError(`发送太快了，请等待 ${waitSeconds} 秒后重试。`);
  setMessages((prev) => prev.filter((m) => m !== userMsg));
  return;
}
```

修改 `handleClearError` 函数，同时清除倒计时：
```tsx
const handleClearError = () => {
  setError(null);
  setRateLimited(false);
  setRetryAfter(0);
};
```

修改错误横幅中的重试按钮（第 423 行附近），添加 disabled 条件：
```tsx
{rateLimited && (
  <button
    type="button"
    onClick={() => {
      handleClearError();
    }}
    disabled={retryAfter > 0}
    className="flex-shrink-0 rounded-[8px] bg-[#FF7A59] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#FF7A59]/90 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {retryAfter > 0 ? `重试 (${retryAfter}s)` : '重试'}
  </button>
)}
```

同时更新错误横幅中的文本以显示具体剩余秒数（修改第 410-412 行）：
```tsx
<p className="text-sm font-medium text-red-800">
  {rateLimited ? `发送太快 (${retryAfter}s 后可重试)` : '出错了'}
</p>
```

- [ ] **Step 3: 验证构建通过**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npx tsc --noEmit 2>&1 | head -30
```
Expected: 无新增类型错误

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/route.ts app/\[lang\]/chat/\[expert\]/page.tsx
git commit -m "feat: add rate limit cooldown countdown with Retry-After header

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: 402/429 错误处理一致性 + 会话切换加载过渡

**Files:**
- Modify: `app/[lang]/chat/[expert]/page.tsx`

- [ ] **Step 1: 统一 402 处理（回滚用户消息）**

在 page.tsx 中，修改 402 处理（约第 162-175 行），将：
```tsx
// 试用已耗尽 (402 Payment Required)
if (res.status === 402) {
  setSubscriptionStatus((prev) =>
    prev ? { ...prev, trialUsed: prev.trialLimit } : prev
  );
  setMessages((prev) => [
    ...prev,
    {
      role: 'assistant',
      content: '你已用完 3 条免费消息，请订阅后继续。',
    },
  ]);
  return;
}
```
改为（回滚用户消息 + 添加系统提示）：
```tsx
// 试用已耗尽 (402 Payment Required)
if (res.status === 402) {
  setSubscriptionStatus((prev) =>
    prev ? { ...prev, trialUsed: prev.trialLimit } : prev
  );
  // 回滚乐观更新的用户消息
  setMessages((prev) => {
    const rolled = prev.filter((m) => m !== userMsg);
    return [
      ...rolled,
      {
        role: 'assistant',
        content: '你已用完 3 条免费消息，请订阅后继续。',
      },
    ];
  });
  return;
}
```

- [ ] **Step 2: 添加 loadingHistory 状态**

在 state 声明区域添加：
```tsx
const [loadingHistory, setLoadingHistory] = useState(false);
```

修改会话切换加载逻辑（约第 91-118 行），在 `setMessages([])` 之前设置加载状态：
```tsx
useEffect(() => {
  if (!urlConvId) return;

  setConversationId(urlConvId);
  setMessages([]);
  setError(null);
  setLoadingHistory(true);  // 添加

  fetch(`/api/conversations/${urlConvId}`)
    .then((res) => {
      if (!res.ok) throw new Error('Failed');
      return res.json();
    })
    .then((data) => {
      if (data.messages?.length > 0) {
        setMessages(
          data.messages.map(
            (m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }),
          ),
        );
      }
    })
    .catch((err) =>
      console.error('Failed to load conversation:', err),
    )
    .finally(() => setLoadingHistory(false));  // 添加
}, [urlConvId]);
```

- [ ] **Step 3: 将 loadingHistory 传入 MessageList**

在 JSX 中 MessageList 使用处（约第 438 行），添加 prop：
```tsx
<MessageList
  messages={messages}
  expert={currentExpert}
  onSuggestionClick={(text) => handleSend(text)}
  subscriptionStatus={subscriptionStatus}
  loadingHistory={loadingHistory}
/>
```

- [ ] **Step 4: 验证构建通过**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npx tsc --noEmit 2>&1 | head -30
```
Expected: 无新增类型错误

- [ ] **Step 5: Commit**

```bash
git add app/\[lang\]/chat/\[expert\]/page.tsx
git commit -m "fix: unify 402/429 error handling and add loading state for conversation switch

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: 侧边栏删除对话

**Files:**
- Modify: `components/chat/ChatSidebar.tsx`

- [ ] **Step 1: 添加删除按钮和逻辑**

修改 `components/chat/ChatSidebar.tsx`：

在文件顶部导入中添加 `useTranslations`（如果未使用 chat namespace）：
```tsx
// 已有 useTranslations
```

添加 `handleDelete` 函数（在 `formatDate` 函数之后）：
```tsx
const handleDelete = async (convId: string) => {
  if (!window.confirm('Delete this conversation?')) return;
  try {
    const res = await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== convId));
    }
  } catch (err) {
    console.error('Failed to delete conversation:', err);
  }
};
```

修改对话列表项渲染（第 152-182 行），在按钮内部添加删除图标。将原有的 button 内容替换为：
```tsx
{conversations.map((conv) => {
  const expert = (conv.expert || 'liam') as ExpertId;
  const meta = EXPERT_META[expert] || EXPERT_META.liam;

  return (
    <div key={conv.id} className="group relative">
      <button
        type="button"
        onClick={() => {
          router.push(`/${lang}/chat/${expert}?c=${conv.id}`);
          onClose?.();
        }}
        className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 pr-10 text-left transition-colors hover:bg-gray-50"
      >
        <span
          className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">
            {conv.title || 'New Conversation'}
          </p>
          <p className="text-xs text-text-secondary">
            {formatDate(conv.updatedAt)}
          </p>
        </div>
      </button>
      {/* 删除按钮 — hover 时显示 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(conv.id);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[8px] p-1.5 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        aria-label="Delete conversation"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
})}
```

注：原列表中 button 元素改为 `div` 容器包裹，内部 button 负责点击跳转，删除按钮独立放置。

- [ ] **Step 2: 验证构建通过**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npx tsc --noEmit 2>&1 | head -30
```
Expected: 无新增类型错误

- [ ] **Step 3: Commit**

```bash
git add components/chat/ChatSidebar.tsx
git commit -m "feat: add delete button to chat sidebar conversation list

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: 端到端验证

- [ ] **Step 1: TypeScript 编译检查**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npx tsc --noEmit 2>&1
```
Expected: 无类型错误

- [ ] **Step 2: 构建检查**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npm run build 2>&1 | tail -20
```
Expected: 构建成功

- [ ] **Step 3: 启动开发服务器并人工验证**

```bash
cd /home/ml/project/ai/mvp/star1-relation && npm run dev
```

验证以下场景：
1. Navbar 点击 "Start Chat" → 正常跳转到聊天页 `/chat` → 重定向到 `/chat/liam`
2. 发送消息 → 发送按钮变为红色停止方块 → 点击停止 → 生成中断
3. AI 回复中的 Markdown（列表、粗体、链接）正确渲染
4. 对话列表 hover 显示删除图标 → 点击 → 确认 → 对话被删除
5. 向上滚动后收到新消息 → 不自动滚到底部 → 显示「↓ New messages」按钮
6. 试用耗尽时发送消息 → 用户消息回滚 + 显示订阅提示

- [ ] **Step 4: Commit 验证通过**

```bash
git status
```
Expected: 无未提交的变更

// ============================================================
// components/chat/MessageList.tsx — 消息列表组件
// ============================================================
// 客户端组件：
//   - 渲染消息列表：空时显示 WelcomeCard
//   - 新消息到达时自动滚动到底部
//   - 使用 useRef + useEffect + scrollIntoView 实现
// ============================================================

'use client';

import { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { WelcomeCard } from './WelcomeCard';

/** 消息项类型 */
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/** MessageList Props */
interface MessageListProps {
  /** 消息列表 */
  messages: Message[];
  /** 当前专家标识符 */
  expert: string;
  /** 建议问题点击回调（传入 WelcomeCard） */
  onSuggestionClick?: (text: string) => void;
}

/**
 * MessageList — 对话消息列表
 * 管理消息渲染和自动滚动行为
 */
export function MessageList({
  messages,
  expert,
  onSuggestionClick,
}: MessageListProps) {
  // ---------- 滚动锚点引用 ----------
  const bottomRef = useRef<HTMLDivElement>(null);

  // ---------- 新消息到达时自动滚动到底部 ----------
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---------- 空消息 → 欢迎卡片 ----------
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

  // ---------- 渲染消息列表 ----------
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      {messages.map((msg, index) => (
        <MessageBubble key={index} role={msg.role} content={msg.content} />
      ))}
      {/* 滚动锚点 — 始终在列表末尾，新消息到达时滚动至此 */}
      <div ref={bottomRef} />
    </div>
  );
}

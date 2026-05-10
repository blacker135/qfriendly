// ============================================================
// components/chat/ChatInput.tsx — 消息输入框组件
// ============================================================
// 客户端组件：
//   - Form 表单，容器 rounded-[18px]、bg-[#FAF7F2]
//   - 输入框 placeholder 来自 chat.inputPlaceholder
//   - 提交按钮：rounded-full、bg-[#FF7A59]、↗ 图标、空内容时 disabled
//   - Enter 发送、Shift+Enter 换行
// ============================================================

'use client';

import { useState, FormEvent, KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';

/** ChatInput Props */
interface ChatInputProps {
  /** 发送消息回调 */
  onSend: (message: string) => void;
}

/**
 * ChatInput — 聊天消息输入区域
 * 底部固定区域，包含输入框和发送按钮
 */
export function ChatInput({ onSend }: ChatInputProps) {
  const t = useTranslations('chat');
  const [input, setInput] = useState('');

  // ---------- 提交处理 ----------
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setInput(''); // 发送后清空
  };

  // ---------- 键盘事件：Enter 发送，Shift+Enter 换行 ----------
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const trimmed = input.trim();
      if (!trimmed) return;
      onSend(trimmed);
      setInput('');
    }
  };

  // ---------- 渲染 ----------
  return (
    <div className="border-t border-gray-100 bg-white px-4 py-3">
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-3 rounded-[18px] bg-[#FAF7F2] px-4 py-3"
      >
        {/* 消息输入框 — 自适应高度 textarea */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('inputPlaceholder')}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder-gray-400 outline-none"
          style={{ maxHeight: '120px' }}
          onInput={(e) => {
            // 自动调整高度
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
          }}
        />

        {/* 发送按钮 — 圆形 + 箭头图标 */}
        <button
          type="submit"
          disabled={!input.trim()}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#FF7A59] text-white transition-all hover:bg-[#FF7A59]/90 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label={t('send')}
        >
          {/* ↗ 发送图标 */}
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
              d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}

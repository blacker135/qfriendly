// ============================================================
// components/chat/MessageBubble.tsx — 消息气泡组件
// ============================================================
// 客户端组件，纯展示：
//   - 用户消息：右对齐、max-w-[70%]、bg-[#FF7A59]/10、rounded-[18px]
//   - AI 消息：左对齐、max-w-[80%]、白色背景 + 边框、rounded-[18px]、shadow-soft
//   - 空内容 → 动画加载点（三个跳动圆点）
// ============================================================

'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** MessageBubble Props */
interface MessageBubbleProps {
  /** 消息角色 */
  role: 'user' | 'assistant';
  /** 消息文本内容（空字符串时显示加载动画） */
  content: string;
}

/**
 * MessageBubble — 单条消息气泡
 * 根据角色渲染不同样式（用户靠右，AI 靠左）
 */
export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === 'user';

  // ---------- 空内容 → 加载动画 ----------
  if (!content || content.length === 0) {
    return (
      <div className={`flex mb-3 lg:mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`rounded-[18px] px-4 py-2.5 md:px-4 md:py-3 lg:px-5 lg:py-3 ${
            isUser
              ? 'max-w-[85%] md:max-w-[75%] lg:max-w-[65%] bg-[#FF7A59]/10'
              : 'max-w-[92%] md:max-w-[85%] lg:max-w-[75%] border border-gray-100 bg-white shadow-soft'
          }`}
        >
          {/* 三个跳动圆点的加载动画 */}
          <div className="flex items-center gap-1.5 py-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="inline-block h-2 w-2 rounded-full bg-[#FF7A59]/40"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.2,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------- 正常消息渲染 ----------
  return (
    <motion.div
      className={`flex mb-3 lg:mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div
        className={`rounded-[18px] px-4 py-2.5 md:px-4 md:py-3 lg:px-5 lg:py-3 text-[15px] lg:text-sm leading-relaxed ${
          isUser
            ? 'max-w-[85%] md:max-w-[75%] lg:max-w-[65%] bg-[#FF7A59]/10 text-text-primary'
            : 'max-w-[92%] md:max-w-[85%] lg:max-w-[75%] border border-gray-100 bg-white text-text-primary shadow-soft prose prose-sm prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-a:text-[#FF7A59]'
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
}

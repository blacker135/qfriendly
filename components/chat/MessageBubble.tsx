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
      <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`rounded-[18px] px-5 py-3 ${
            isUser
              ? 'max-w-[70%] bg-[#FF7A59]/10'
              : 'max-w-[80%] border border-gray-100 bg-white shadow-soft'
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
      className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div
        className={`rounded-[18px] px-5 py-3 text-sm leading-relaxed ${
          isUser
            ? 'max-w-[70%] bg-[#FF7A59]/10 text-text-primary'
            : 'max-w-[80%] border border-gray-100 bg-white text-text-primary shadow-soft'
        }`}
      >
        {/* 保留换行符 */}
        {content.split('\n').map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {line}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

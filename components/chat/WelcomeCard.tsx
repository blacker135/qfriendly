// ============================================================
// components/chat/WelcomeCard.tsx — 欢迎卡片组件
// ============================================================
// 客户端组件，对话无消息时展示：
//   - ExpertAvatar 彩色圆形首字母头像（替换 emoji）
//   - greeting/role/intro 问候语（来自 i18n welcome.[expert].* ）
//   - 3 个建议问题按钮（MessageCircle SVG 点击触发 onSuggestionClick）
//   - Framer Motion 淡入 + 上滑入场动画
//   - 响应式布局：移动端优化间距与字体大小
// ============================================================

'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { ExpertId } from '@/lib/prompts/experts';
import { ExpertAvatar } from './ExpertAvatar';

/** WelcomeCard Props */
interface WelcomeCardProps {
  /** 当前专家标识符 */
  expert: string;
  /** 点击建议问题回调 */
  onSuggestionClick: (text: string) => void;
}

/**
 * WelcomeCard — 对话欢迎卡片
 * 当消息列表为空时显示，提供专家信息和建议问题
 */
export function WelcomeCard({ expert, onSuggestionClick }: WelcomeCardProps) {
  const t = useTranslations();

  // ---------- 获取专家数据 ----------
  const expertId = (expert || 'liam') as ExpertId;

  // 从 i18n 读取专家欢迎信息（含回退）
  const greeting = t(`welcome.${expertId}.greeting`);
  const role = t(`welcome.${expertId}.role`);
  const intro = t(`welcome.${expertId}.intro`);

  // 读取建议问题列表（i18n 中为数组，next-intl 通过索引访问）
  const suggestion1 = t(`welcome.${expertId}.suggestions.0`);
  const suggestion2 = t(`welcome.${expertId}.suggestions.1`);
  const suggestion3 = t(`welcome.${expertId}.suggestions.2`);
  const suggestions = [suggestion1, suggestion2, suggestion3].filter(Boolean);

  // ---------- 渲染 ----------
  return (
    <motion.div
      className="flex flex-col items-center px-4 py-8 sm:py-12 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* 专家首字母头像 — 替换 emoji */}
      <ExpertAvatar expert={expertId} size="lg" className="mb-6" />

      {/* 问候语 */}
      <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">{greeting}</h2>

      {/* 角色 */}
      <p className="mt-2 text-sm font-medium text-[#FF7A59]">{role}</p>

      {/* 介绍文本 */}
      <p className="mt-4 max-w-md sm:max-w-lg text-sm sm:text-base leading-relaxed text-text-secondary">
        {intro}
      </p>

      {/* 建议问题按钮 — MessageCircle SVG 图标 + 文字 */}
      {suggestions.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onSuggestionClick(suggestion)}
              className="inline-flex items-center gap-2 rounded-[16px] border border-gray-200 bg-white px-4 py-2.5 text-sm text-text-primary shadow-soft transition-colors hover:border-[#FF7A59]/30 hover:bg-[#FF7A59]/5 cursor-pointer touch-manipulation min-h-[44px]"
            >
              <svg className="h-4 w-4 flex-shrink-0 text-[#FF7A59]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="max-w-[280px] truncate">{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

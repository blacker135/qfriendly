// ============================================================
// components/chat/WelcomeCard.tsx — 欢迎卡片组件
// ============================================================
// 客户端组件，对话无消息时展示：
//   - 当前专家颜色 emoji 圆形头像
//   - greeting/role/intro 问候语（来自 i18n welcome.[expert].* ）
//   - 3 个建议问题按钮（💬 点击触发 onSuggestionClick）
//   - Framer Motion 淡入 + 上滑入场动画
// ============================================================

'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { EXPERT_META } from '@/lib/prompts/experts';
import type { ExpertId } from '@/lib/prompts/experts';

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
  const meta = EXPERT_META[expertId] || EXPERT_META.liam;

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
      className="flex flex-col items-center px-6 py-12 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* 专家 Emoji 圆形头像 */}
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full text-4xl"
        style={{
          backgroundColor: `${meta.color}15`,
        }}
      >
        <span role="img" aria-label={expertId}>
          {meta.emoji}
        </span>
      </div>

      {/* 问候语 */}
      <h2 className="text-2xl font-semibold text-text-primary">{greeting}</h2>

      {/* 角色 */}
      <p className="mt-2 text-sm font-medium text-[#FF7A59]">{role}</p>

      {/* 介绍文本 */}
      <p className="mt-4 max-w-md text-sm leading-relaxed text-text-secondary">
        {intro}
      </p>

      {/* 建议问题按钮 — 图标 + 文字 */}
      {suggestions.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onSuggestionClick(suggestion)}
              className="inline-flex items-center gap-2 rounded-[16px] border border-gray-200 bg-white px-4 py-2.5 text-sm text-text-primary shadow-soft transition-all hover:border-[#FF7A59]/30 hover:bg-[#FF7A59]/5"
            >
              <span className="text-base">💬</span>
              <span className="max-w-[240px] truncate">{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

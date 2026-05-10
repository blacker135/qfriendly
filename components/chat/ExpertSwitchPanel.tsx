// ============================================================
// components/chat/ExpertSwitchPanel.tsx — 专家切换浮动面板
// ============================================================
// 客户端模态/覆盖层组件：
//   - 固定位置全屏覆盖层（bg-black/20 + backdrop-blur-sm）
//   - 点击外部区域关闭
//   - rounded-[32px] 白色卡片居中展示
//   - "Choose your guide" 标题
//   - 4 个专家按钮：emoji 圆形、名称、头衔、tagline
//   - 当前专家高亮 + 彩色边框
//   - Framer Motion 动画：overlay 淡入、卡片缩放进入
// ============================================================

'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { EXPERT_META } from '@/lib/prompts/experts';
import type { ExpertId } from '@/lib/prompts/experts';

/** ExpertSwitchPanel Props */
interface ExpertSwitchPanelProps {
  /** 选择专家回调 */
  onSelect: (expert: string) => void;
  /** 关闭面板回调 */
  onClose: () => void;
  /** 当前选中的专家标识符 */
  currentExpert: string;
  /** 当前语言 */
  lang: string;
}

/** 专家详情数据（名称、头衔、副标题） */
const EXPERT_DETAILS: Record<
  string,
  { name: string; title: string; tagline: string }
> = {
  evan: {
    name: 'Evan Pierce',
    title: 'The Relationship Stabilizer',
    tagline: 'Calm, rational, structured guidance for building emotional stability.',
  },
  liam: {
    name: 'Liam Hart',
    title: 'The Relationship Gardener',
    tagline: 'Warm, supportive, gently coaching — nurture what matters.',
  },
  noah: {
    name: 'Noah Sinclair',
    title: 'The Attraction Strategist',
    tagline: 'Insightful, sharp, slightly playful — understand the dynamics.',
  },
  adrian: {
    name: 'Dr. Adrian Cole',
    title: 'The Relationship Intervention Specialist',
    tagline: 'Clinical yet empathetic — crisis recovery with clarity.',
  },
};

/**
 * ExpertSwitchPanel — 专家选择浮动面板
 * 从底部或居中弹出，展示四位专家供用户切换
 */
export function ExpertSwitchPanel({
  onSelect,
  onClose,
  currentExpert,
  lang,
}: ExpertSwitchPanelProps) {
  const t = useTranslations('chat');
  const panelRef = useRef<HTMLDivElement>(null);

  // ---------- 点击外部区域关闭 ----------
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    // 延迟绑定，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // ---------- Escape 键关闭 ----------
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // ---------- 渲染 ----------
  const expertIds: ExpertId[] = ['liam', 'evan', 'noah', 'adrian'];

  return (
    <AnimatePresence>
      {/* 覆盖层 — 固定定位全屏 */}
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* 面板卡片 — 圆角 32px */}
        <motion.div
          ref={panelRef}
          className="mx-4 w-full max-w-lg rounded-[32px] bg-white p-8 shadow-soft"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {/* 标题 */}
          <h2 className="text-center text-xl font-semibold text-text-primary">
            {t('chooseExpert')}
          </h2>
          <p className="mt-1 text-center text-sm text-text-secondary">
            Each expert brings a unique perspective to your conversation
          </p>

          {/* 专家列表 — 4 个按钮垂直排列 */}
          <div className="mt-6 space-y-3">
            {expertIds.map((id) => {
              const meta = EXPERT_META[id];
              const details = EXPERT_DETAILS[id];
              const isActive = currentExpert === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  className={`flex w-full items-center gap-4 rounded-[20px] border-2 p-4 text-left transition-all ${
                    isActive
                      ? 'border-[#FF7A59] bg-[#FF7A59]/5'
                      : 'border-transparent bg-[#FAF7F2] hover:bg-gray-100'
                  }`}
                >
                  {/* Emoji 圆形头像 */}
                  <span
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl"
                    style={{
                      backgroundColor: `${meta.color}15`,
                      color: meta.color,
                    }}
                  >
                    {meta.emoji}
                  </span>
                  {/* 专家信息 */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary">
                      {details.name}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {details.title}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary/70">
                      {details.tagline}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 关闭按钮 */}
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full rounded-[16px] border border-gray-200 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

'use client';
// components/admin/prompts/PromptEditor.tsx
// 智能体提示词编辑器 — 三层 Tab：专家 → 语言 → 内容类型
// 深色主题 + Fira Code 等宽字体 + 响应式布局

import { useState, useEffect, useCallback } from 'react';
import { Shield, Sprout, Sparkles, HeartPulse, Loader2, CheckCircle2, XCircle } from 'lucide-react';

// ============================================================
// 类型定义
// ============================================================

type ExpertId = 'evan' | 'liam' | 'noah' | 'adrian';
type Language = 'en' | 'zh';
type PromptType = 'system' | 'welcome' | 'switch';

interface PromptRecord {
  id: string;
  expert: ExpertId;
  language: Language;
  promptType: PromptType;
  content: string;
  updatedAt: string;
}

/** 专家 Tab 配置 */
const EXPERT_TABS: { id: ExpertId; name: string; titleZh: string; color: string; icon: React.ElementType }[] = [
  { id: 'evan',  name: 'Evan Pierce',  titleZh: '情感稳定者', color: '#4A90D9', icon: Shield },
  { id: 'liam',  name: 'Liam Hart',    titleZh: '情感园丁',   color: '#5BA88C', icon: Sprout },
  { id: 'noah',  name: 'Noah Sinclair',titleZh: '吸引策略师', color: '#D4A843', icon: Sparkles },
  { id: 'adrian',name: 'Dr. Adrian Cole',titleZh:'情感干预专家',color:'#C45C5C',icon: HeartPulse },
];

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'English' },
];

const PROMPT_TYPES: { id: PromptType; label: string; rows: number }[] = [
  { id: 'system', label: 'System Prompt', rows: 15 },
  { id: 'welcome', label: '欢迎语', rows: 5 },
  { id: 'switch', label: '切换过渡模板', rows: 10 },
];

/** 根据内容类型获取最小高度 */
function getMinHeight(type: PromptType): string {
  switch (type) {
    case 'system': return 'min-h-[320px]';
    case 'welcome': return 'min-h-[140px]';
    case 'switch': return 'min-h-[220px]';
  }
}

// ============================================================
// Toast 子组件
// ============================================================

function Toast({ type, message, onClose }: { type: 'success' | 'error'; message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';
  const Icon = isSuccess ? CheckCircle2 : XCircle;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 text-sm border motion-safe:animate-[toastIn_200ms_ease-out] ${
        isSuccess
          ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]'
          : 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]'
      }`}
      role="alert"
    >
      <Icon size={16} />
      <span>{message}</span>
    </div>
  );
}

// ============================================================
// 主组件
// ============================================================

export default function PromptEditor() {
  // 编辑内容
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');

  // 全量数据缓存: key = `${expert}:${lang}:${type}`
  const [allPrompts, setAllPrompts] = useState<Map<string, PromptRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 当前选中状态
  const [activeExpert, setActiveExpert] = useState<ExpertId>('evan');
  const [activeLang, setActiveLang] = useState<Language>('zh');
  const [activeType, setActiveType] = useState<PromptType>('system');

  // 保存状态
  const [saveState, setSaveState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  /** 生成 Map key */
  const mapKey = useCallback((expert: ExpertId, lang: Language, type: PromptType) =>
    `${expert}:${lang}:${type}`, []);

  /** 从 API 加载全部数据 */
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/admin/prompts');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const map = new Map<string, PromptRecord>();
        for (const p of data.prompts as PromptRecord[]) {
          map.set(mapKey(p.expert, p.language, p.promptType), p);
        }
        setAllPrompts(map);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [mapKey]);

  /** 当选中项或数据变化时，更新编辑区内容 */
  useEffect(() => {
    const key = mapKey(activeExpert, activeLang, activeType);
    const record = allPrompts.get(key);
    const text = record?.content ?? '';
    setContent(text);
    setOriginalContent(text);
  }, [activeExpert, activeLang, activeType, allPrompts, mapKey]);

  /** 切换 Tab 前保存当前编辑内容到 Map */
  const switchTab = useCallback((expert: ExpertId, lang: Language, type: PromptType) => {
    // 保存当前编辑内容
    const currentKey = mapKey(activeExpert, activeLang, activeType);
    if (content !== originalContent) {
      setAllPrompts((prev) => {
        const next = new Map(prev);
        const existing = next.get(currentKey);
        if (existing) {
          next.set(currentKey, { ...existing, content });
        }
        return next;
      });
    }
    // 切换
    setActiveExpert(expert);
    setActiveLang(lang);
    setActiveType(type);
  }, [activeExpert, activeLang, activeType, content, originalContent, mapKey]);

  /** 保存当前编辑区 */
  const handleSave = async () => {
    if (content.trim().length === 0) return;

    setSaveState('loading');
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: [{ expert: activeExpert, language: activeLang, promptType: activeType, content }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      // 更新本地缓存 + 原始值
      setOriginalContent(content);
      const key = mapKey(activeExpert, activeLang, activeType);
      setAllPrompts((prev) => {
        const next = new Map(prev);
        const existing = next.get(key);
        next.set(key, { ...(existing || { id: '', updatedAt: '' }), content, updatedAt: new Date().toISOString() } as PromptRecord);
        return next;
      });

      setSaveState('success');
      setToast({ type: 'success', message: '保存成功' });
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (err) {
      setSaveState('error');
      setToast({ type: 'error', message: err instanceof Error ? err.message : '保存失败，请重试' });
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  /** 当前记录的最后更新时间 */
  const currentRecord = allPrompts.get(mapKey(activeExpert, activeLang, activeType));
  const lastUpdated = currentRecord?.updatedAt
    ? new Date(currentRecord.updatedAt).toLocaleString('zh-CN', { hour12: false })
    : null;

  // ============================================================
  // 渲染
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-[#999999]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-[#EF4444]">
        加载失败: {error}
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto space-y-5">
      {/* 页面标题 */}
      <h1 className="text-xl font-semibold text-[var(--text-primary)]">智能体提示词</h1>

      {/* 第一层 — 专家 Tab */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {EXPERT_TABS.map((expert) => {
          const active = activeExpert === expert.id;
          return (
            <button
              key={expert.id}
              onClick={() => switchTab(expert.id, activeLang, activeType)}
              className={`cursor-pointer flex items-center gap-2 px-5 py-3 rounded-lg text-left transition-all duration-200 motion-safe:transition-all motion-reduce:transition-none ${
                active
                  ? 'bg-[#363652] border-l-[3px] text-[#E0E0E0]'
                  : 'bg-transparent text-[#999999] hover:bg-[#2D2D44]/50'
              }`}
              style={active ? { borderLeftColor: expert.color } : undefined}
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: expert.color }}
              />
              <div>
                <div className="text-sm font-medium">{expert.name}</div>
                <div className="text-xs text-[#999999]">{expert.titleZh}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 第二层 — 语言 Tab */}
      <div className="flex justify-end gap-2">
        {LANGUAGES.map((lang) => {
          const active = activeLang === lang.id;
          return (
            <button
              key={lang.id}
              onClick={() => switchTab(activeExpert, lang.id, activeType)}
              className={`cursor-pointer px-3 py-1.5 text-sm rounded-full transition-colors duration-200 ${
                active
                  ? 'bg-[#FF7A59]/15 text-[#FF7A59] font-medium'
                  : 'text-[#999999] hover:text-[#E0E0E0]'
              }`}
            >
              {lang.label}
            </button>
          );
        })}
      </div>

      {/* 第三层 — 内容类型 Tab */}
      <div className="flex border-b border-[rgba(255,255,255,0.06)]">
        {PROMPT_TYPES.map((pt) => {
          const active = activeType === pt.id;
          return (
            <button
              key={pt.id}
              onClick={() => switchTab(activeExpert, activeLang, pt.id)}
              className={`cursor-pointer flex-1 text-center pb-2.5 text-sm transition-colors duration-200 ${
                active
                  ? 'text-[#E0E0E0] border-b-2 border-[#FF7A59] font-medium'
                  : 'text-[#999999] hover:text-[#E0E0E0]'
              }`}
            >
              {pt.label}
            </button>
          );
        })}
      </div>

      {/* 编辑区 */}
      <div className="bg-[var(--surface)] border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
        <label htmlFor="prompt-editor" className="sr-only">
          {EXPERT_TABS.find((e) => e.id === activeExpert)?.name} · {LANGUAGES.find((l) => l.id === activeLang)?.label} · {PROMPT_TYPES.find((t) => t.id === activeType)?.label}
        </label>
        <textarea
          id="prompt-editor"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className={`w-full bg-transparent font-mono text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[#6B6B80] p-5 resize-y focus:outline-none focus:border-[#FF7A59] focus:ring-1 focus:ring-[#FF7A59]/30 transition-colors duration-200 ${getMinHeight(activeType)}`}
          placeholder={`输入 ${PROMPT_TYPES.find((t) => t.id === activeType)?.label}...`}
          rows={PROMPT_TYPES.find((t) => t.id === activeType)?.rows}
        />
      </div>

      {/* 操作栏 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-[var(--text-secondary)]">
          {lastUpdated
            ? `最后更新: ${lastUpdated}`
            : '尚未自定义，使用默认值'}
        </div>

        <button
          onClick={handleSave}
          disabled={saveState === 'loading' || content.trim().length === 0}
          className="cursor-pointer inline-flex items-center gap-2 bg-[#FF7A59] hover:bg-[#FF8C70] text-white font-medium px-6 py-2.5 rounded-lg min-w-[120px] min-h-[44px] transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#FF7A59]/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveState === 'loading' ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              保存中...
            </>
          ) : saveState === 'success' ? (
            <>
              <CheckCircle2 size={16} />
              已保存
            </>
          ) : (
            '保存修改'
          )}
        </button>
      </div>

      {/* Toast 通知 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

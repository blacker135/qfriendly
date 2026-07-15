// app/admin/prompts/page.tsx
// 智能体提示词设置页面 — Server Component 入口
// 权限校验由父布局 app/admin/layout.tsx 完成

import type { Metadata } from 'next';
import PromptEditor from '@/components/admin/prompts/PromptEditor';

export const metadata: Metadata = {
  title: '智能体提示词 — QFriendly 管理后台',
};

export default function PromptsPage() {
  return <PromptEditor />;
}

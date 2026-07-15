'use client';
// components/admin/AdminSidebar.tsx
// 管理后台侧边栏导航 — 深色主题 + 分组结构 + Lucide 图标
// bg #1A1A2E, hover #2D2D44, active bg-blue-500/20 text-blue-400

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  Download,
  Settings,
  Bot,
} from 'lucide-react';

/** 导航项类型 — icon 使用 Lucide React 组件 */
interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

/**
 * 导航分组配置
 * 每个 group 有 label（分组标题）和 items（导航项列表）
 */
const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: '概览',
    items: [
      { href: '/admin/dashboard', label: '综合仪表盘', icon: LayoutDashboard },
    ],
  },
  {
    label: '用户',
    items: [
      { href: '/admin/users', label: '用户管理', icon: Users },
    ],
  },
  {
    label: '数据中心',
    items: [
      { href: '/admin/revenue', label: '收入分析', icon: DollarSign },
      { href: '/admin/behavior', label: '用户行为分析', icon: Activity },
      { href: '/admin/traffic', label: '流量统计', icon: BarChart3 },
    ],
  },
  {
    label: '工具',
    items: [
      { href: '/admin/reports', label: '报表导出', icon: Download },
      { href: '/admin/prompts', label: '智能体提示词', icon: Bot },
      { href: '/admin/settings', label: '统计设置', icon: Settings },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  /** 判断导航项是否激活 — 精确匹配或子路径前缀匹配 */
  const isActive = (href: string): boolean => {
    if (pathname === href) return true;
    // 确保不以部分前缀误判（如 /admin/users 不应匹配 /admin/user-settings）
    if (pathname.startsWith(href + '/')) return true;
    return false;
  };

  return (
    <aside className="w-56 flex flex-col shrink-0" style={{ backgroundColor: '#1A1A2E' }}>
      {/* ---- 品牌区 ---- */}
      <div className="p-4 border-b border-gray-700/50">
        <Link
          href="/admin"
          className="text-lg font-bold text-gray-200 hover:text-white transition-colors"
        >
          管理后台
        </Link>
      </div>

      {/* ---- 导航区 ---- */}
      <nav className="flex-1 p-3 space-y-5 overflow-auto">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            {/* 分组标题 */}
            <div className="px-3 mb-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              {group.label}
            </div>

            {/* 分组导航项 */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-150 ${
                      active
                        ? 'bg-blue-500/20 text-blue-400 font-medium'
                        : 'text-gray-400 hover:bg-[#2D2D44] hover:text-gray-200'
                    }`}
                  >
                    <Icon
                      size={18}
                      className={active ? 'text-blue-400' : 'text-gray-500'}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ---- 底部: 返回首页 ---- */}
      <div className="p-3 border-t border-gray-700/50">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-300 rounded-md transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回首页
        </Link>
      </div>
    </aside>
  );
}

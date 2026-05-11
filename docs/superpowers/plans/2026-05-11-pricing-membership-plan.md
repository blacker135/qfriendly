# Pricing 页面 & 会员标识 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构定价页面（按钮切换、年费折算、国内外支付模式、$0.01测试方案）并为导航栏头像添加会员标识和升级入口

**Architecture:** Pricing 页面通过 page.tsx（服务端）读取 IP 国家和环境变量，传入 PricingSection（客户端）控制展示模式。会员标识在 Navbar.tsx 查询数据库后传入 NavbarClient 渲染 Tooltip 标签。

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, next-intl, Tailwind CSS v4

---

### Task 1: 更新 i18n 文案

**Files:**
- Modify: `messages/zh.json`
- Modify: `messages/en.json`

- [ ] **Step 1: 在 zh.json 的 pricing 对象中添加新字段**

在 `messages/zh.json` 的 `pricing` 对象末尾（`features` 块之后），添加以下键：

```json
"monthlyEquivalent": "折合 ${{price}}/月",
"savePerYear": "比月付省 ${{amount}}/年",
"testPlanName": "测试方案",
"testPlanCTA": "测试支付 ($0.01)",
"oneTime": "一次性付费",
"validDays": "{{days}} 天有效"
```

- [ ] **Step 2: 在 zh.json 中添加 membership 对象**

在 `messages/zh.json` 的顶层（与 `pricing` 同级），添加：

```json
"membership": {
  "upgrade": "升级",
  "expires": "到期：{{date}}",
  "oneTimeExpires": "有效至：{{date}}",
  "benefitMessages": "每日 {{count}} 条消息",
  "benefitUnlimitedMessages": "消息无限制",
  "benefitExperts": "Evan & Liam",
  "benefitExpertsAll": "全部 4 位专家",
  "benefitHistoryDays": "{{count}} 天对话历史",
  "benefitHistoryForever": "无限对话历史",
  "benefitDepthLight": "轻量指导",
  "benefitDepthStandard": "标准深度",
  "benefitDepthDeep": "深度专注指导"
}
```

- [ ] **Step 3: 在 en.json 的 pricing 对象中添加新字段**

在 `messages/en.json` 的 `pricing` 对象末尾：

```json
"monthlyEquivalent": "${{price}}/mo equivalent",
"savePerYear": "Save ${{amount}}/yr vs monthly",
"testPlanName": "Test Plan",
"testPlanCTA": "Test Pay ($0.01)",
"oneTime": "One-time payment",
"validDays": "Valid {{days}} days"
```

- [ ] **Step 4: 在 en.json 中添加 membership 对象**

在 `messages/en.json` 的顶层（与 `pricing` 同级）：

```json
"membership": {
  "upgrade": "Upgrade",
  "expires": "Expires: {{date}}",
  "oneTimeExpires": "Valid until: {{date}}",
  "benefitMessages": "{{count}} messages / day",
  "benefitUnlimitedMessages": "Unlimited messages",
  "benefitExperts": "Evan & Liam",
  "benefitExpertsAll": "All 4 experts",
  "benefitHistoryDays": "{{count}}-day chat history",
  "benefitHistoryForever": "Unlimited chat history",
  "benefitDepthLight": "Light guidance",
  "benefitDepthStandard": "Standard depth",
  "benefitDepthDeep": "Deep, focused guidance"
}
```

- [ ] **Step 5: 验证 JSON 有效**

运行：`node -e "JSON.parse(require('fs').readFileSync('messages/zh.json','utf8')); console.log('zh.json OK')" && node -e "JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('en.json OK')"`
预期输出：两行 OK

- [ ] **Step 6: Commit**

```bash
git add messages/zh.json messages/en.json
git commit -m "feat: add pricing & membership i18n keys for pricing page redesign and member badge"
```

---

### Task 2: 更新 PricingCard 组件

**Files:**
- Modify: `components/pricing/PricingCard.tsx`

- [ ] **Step 1: 扩展 PlanData 接口和 PricingCardProps**

将 `components/pricing/PricingCard.tsx` 中的接口定义替换为：

```typescript
interface PlanData {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  onetimePrice: number;  // 国内一次性买断价格
  features: string[];
  highlighted?: boolean;
  validDays?: number; // 一次性买断的有效天数
}

interface PricingCardProps {
  plan: PlanData;
  isYearly: boolean;
  isOneTime: boolean;   // 国内一次性买断模式
  isTestPlan: boolean;   // $0.01 测试方案
  isLoggedIn: boolean;
  variantId: string;
  lang: string;
}
```

- [ ] **Step 2: 更新组件函数签名和价格计算逻辑**

替换函数签名及价格计算部分（第 26-31 行左右）：

```typescript
export function PricingCard({ plan, isYearly, isOneTime, isTestPlan, isLoggedIn, variantId, lang }: PricingCardProps) {
  const router = useRouter();
  const tp = useTranslations('pricing');

  // 折算月费（年费 ÷ 12）
  const monthlyEquivalent = (plan.yearlyPrice / 12).toFixed(2);
  // 年付比月付节省的金额
  const yearlySaving = plan.monthlyPrice * 12 - plan.yearlyPrice;
  // 折扣百分比
  const savePercent = Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100);

  // 确定展示价格和周期
  const displayPrice = isOneTime
    ? plan.onetimePrice    // 国内：展示一次性买断价格
    : isYearly
      ? monthlyEquivalent  // 国外年付：展示折算月费
      : plan.monthlyPrice; // 国外月付：展示月费

  const periodLabel = isOneTime
    ? ''                   // 一次性：无周期
    : isYearly
      ? `/${tp('month')}`  // 年付折算：/月
      : `/${tp('month')}`; // 月付：/月
```

- [ ] **Step 3: 替换价格展示部分 JSX**

将现有的价格展示块（第 67-74 行，`{/* 价格展示 */}` 部分）替换为：

```tsx
      {/* 价格展示 */}
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-text-primary">${displayPrice}</span>
        {periodLabel && (
          <span className="text-sm text-text-secondary">{periodLabel}</span>
        )}
      </div>

      {/* 一次性付费标注 */}
      {isOneTime && plan.validDays && (
        <p className="mt-1 text-xs text-[#FF7A59]">
          {tp('validDays', { days: plan.validDays })}
        </p>
      )}

      {/* 年付折算：显示年费总额 + 省钱标注 */}
      {isYearly && !isOneTime && (
        <div className="mt-1">
          <p className="text-xs text-text-secondary">
            ${plan.yearlyPrice}/{tp('year')}
          </p>
          <p className="text-xs text-[#FF7A59]">
            {tp('savePerYear', { amount: yearlySaving })}
          </p>
        </div>
      )}
```

- [ ] **Step 4: 替换卡片容器实现测试方案虚线边框**

将卡片容器（第 56-61 行，`<div className={...}>` 部分）替换为：

```tsx
  return (
    <div
      className={`flex flex-col rounded-[24px] border-2 p-6 ${
        isTestPlan
          ? 'border-dashed border-gray-300 bg-white/60'
          : plan.highlighted
            ? 'border-[#FF7A59] bg-[#FF7A59]/5'
            : 'border-gray-100 bg-white'
      }`}
    >
```

- [ ] **Step 5: 更新 CTA 按钮文案（测试方案用特殊文案）**

将 CTA 按钮的文案逻辑（第 103-106 行）替换为：

```tsx
        {isTestPlan
          ? tp('testPlanCTA')
          : isLoggedIn
            ? tp('subscribe')
            : tp('startTrial')}
```

- [ ] **Step 6: Commit**

```bash
git add components/pricing/PricingCard.tsx
git commit -m "feat: update PricingCard for yearly monthly equivalent, onetime payment, and test plan styling"
```

---

### Task 3: 更新 PricingSection 组件

**Files:**
- Modify: `components/pricing/PricingSection.tsx`

- [ ] **Step 1: 扩展 PricingSectionProps**

替换 `PricingSectionProps` 接口：

```typescript
interface PricingSectionProps {
  lang: string;
  isLoggedIn: boolean;
  isDomestic: boolean;       // 国内用户 = 一次性买断
  showTestPlan: boolean;     // 显示 $0.01 测试方案
  variantIds: {
    starterMonthly: string;
    starterYearly: string;
    proMonthly: string;
    proYearly: string;
    ultraMonthly: string;
    ultraYearly: string;
    starterOnetime: string;
    proOnetime: string;
    ultraOnetime: string;
    test: string;
  };
}
```

- [ ] **Step 2: 更新组件函数签名**

替换函数签名：

```typescript
export function PricingSection({ lang, isLoggedIn, isDomestic, showTestPlan, variantIds }: PricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false);
  const tp = useTranslations('pricing');
```

- [ ] **Step 3: 扩展 plans 数组，添加 validDays、onetime variant IDs 和 test plan**

替换 plans 数组定义：

```typescript
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      monthlyPrice: 9,
      yearlyPrice: 99,
      onetimePrice: 99,
      validDays: 30,
      variantIdMonthly: variantIds.starterMonthly,
      variantIdYearly: variantIds.starterYearly,
      variantIdOnetime: variantIds.starterOnetime,
      features: [
        tp('features.dailyMessages', { count: 30 }),
        tp('features.expertsStarter'),
        tp('features.historyDays', { count: 7 }),
        tp('features.effectLight'),
      ],
    },
    {
      id: 'pro',
      name: 'Pro',
      monthlyPrice: 29,
      yearlyPrice: 319,
      onetimePrice: 319,
      validDays: 30,
      highlighted: true,
      variantIdMonthly: variantIds.proMonthly,
      variantIdYearly: variantIds.proYearly,
      variantIdOnetime: variantIds.proOnetime,
      features: [
        tp('features.dailyMessages', { count: 100 }),
        tp('features.expertsAll'),
        tp('features.historyDays', { count: 30 }),
        tp('features.effectStandard'),
      ],
    },
    {
      id: 'ultra',
      name: 'Ultra',
      monthlyPrice: 49,
      yearlyPrice: 539,
      onetimePrice: 539,
      validDays: 30,
      variantIdMonthly: variantIds.ultraMonthly,
      variantIdYearly: variantIds.ultraYearly,
      variantIdOnetime: variantIds.ultraOnetime,
      features: [
        tp('features.unlimitedMessages'),
        tp('features.expertsAll'),
        tp('features.historyForever'),
        tp('features.effectDeep'),
      ],
    },
  ];

  // 计算年付折扣百分比（取最大折扣展示）
  const maxSavePercent = Math.round(
    (1 - plans[2].yearlyPrice / (plans[2].monthlyPrice * 12)) * 100
  );
```

- [ ] **Step 4: 替换月付/年付切换区域为按钮组（仅国外模式）**

将现有 toggle switch JSX（第 83-110 行）替换为：

```tsx
      {/* 月付/年付按钮切换 — 仅国外订阅制用户可见 */}
      {!isDomestic && (
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex items-center rounded-full bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                !isYearly ? 'bg-[#FF7A59] text-white' : 'text-text-secondary'
              }`}
            >
              {tp('monthly')}
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isYearly ? 'bg-[#FF7A59] text-white' : 'text-text-secondary'
              }`}
            >
              {tp('yearly')}
            </button>
            {/* 年付省钱标签 — 始终可见但年付选中时高亮 */}
            <span className="ml-1 rounded-full bg-[#FF7A59]/10 px-2 py-0.5 text-xs font-medium text-[#FF7A59]">
              {tp('savePercent', { percent: maxSavePercent })}
            </span>
          </div>
        </div>
      )}

      {/* 国内模式提示 */}
      {isDomestic && (
        <p className="mt-6 text-center text-sm text-text-secondary">
          {tp('oneTime')}
        </p>
      )}
```

- [ ] **Step 5: 更新卡片网格，加入 test plan 并传递新 props**

替换卡片网格部分（第 113-124 行）：

```tsx
      {/* 方案卡片网格 — 国内 3 列，测试方案开启时 4 列 */}
      <div className={`mt-10 grid gap-6 ${showTestPlan ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        {plans.map((plan) => {
          const cardVariantId = isDomestic
            ? plan.variantIdOnetime
            : isYearly
              ? plan.variantIdYearly
              : plan.variantIdMonthly;

          return (
            <PricingCard
              key={plan.id}
              plan={plan}
              isYearly={isYearly}
              isOneTime={isDomestic}
              isTestPlan={false}
              isLoggedIn={isLoggedIn}
              variantId={cardVariantId}
              lang={lang}
            />
          );
        })}

        {/* $0.01 测试方案 */}
        {showTestPlan && (
          <PricingCard
            plan={{
              id: 'test',
              name: tp('testPlanName'),
              monthlyPrice: 0.01,
              yearlyPrice: 0.01,
              onetimePrice: 0.01,
              features: [
                tp('features.dailyMessages', { count: 30 }),
                tp('features.expertsStarter'),
                tp('features.historyDays', { count: 7 }),
                tp('features.effectLight'),
              ],
            }}
            isYearly={false}
            isOneTime={false}
            isTestPlan={true}
            isLoggedIn={isLoggedIn}
            variantId={variantIds.test}
            lang={lang}
          />
        )}
      </div>
```

- [ ] **Step 6: Commit**

```bash
git add components/pricing/PricingSection.tsx
git commit -m "feat: add button toggle, domestic/foreign payment mode, and test plan to PricingSection"
```

---

### Task 4: 更新 Pricing 页面服务端组件

**Files:**
- Modify: `app/[lang]/pricing/page.tsx`

- [ ] **Step 1: 替换整个文件**

将 `app/[lang]/pricing/page.tsx` 完整替换为：

```typescript
// app/[lang]/pricing/page.tsx
// /[lang]/pricing — 定价页（服务端组件）
// 读取 IP 国家、环境变量，传入 PricingSection

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { PricingSection } from '@/components/pricing/PricingSection';

export default async function PricingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  // 判断国内/国外：优先 x-vercel-ip-country，语言兜底
  const headersList = await headers();
  const ipCountry = headersList.get('x-vercel-ip-country');
  const isDomestic = ipCountry === 'CN' || (!ipCountry && lang === 'zh');

  // $0.01 测试方案显隐
  const showTestPlan = process.env.NEXT_PUBLIC_SHOW_TEST_PLAN === 'true';

  const variantIds = {
    starterMonthly: process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY || '',
    starterYearly: process.env.LEMONSQUEEZY_VARIANT_STARTER_YEARLY || '',
    proMonthly: process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY || '',
    proYearly: process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY || '',
    ultraMonthly: process.env.LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY || '',
    ultraYearly: process.env.LEMONSQUEEZY_VARIANT_ULTRA_YEARLY || '',
    starterOnetime: process.env.LEMONSQUEEZY_VARIANT_STARTER_ONETIME || '',
    proOnetime: process.env.LEMONSQUEEZY_VARIANT_PRO_ONETIME || '',
    ultraOnetime: process.env.LEMONSQUEEZY_VARIANT_ULTRA_ONETIME || '',
    test: process.env.LEMONSQUEEZY_VARIANT_TEST || '',
  };

  return (
    <main>
      <PricingSection
        lang={lang}
        isLoggedIn={!!session?.user}
        isDomestic={isDomestic}
        showTestPlan={showTestPlan}
        variantIds={variantIds}
      />
    </main>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

运行：`npx tsc --noEmit 2>&1 | head -30`
预期输出：无错误（或仅有预先存在的错误）

- [ ] **Step 3: Commit**

```bash
git add app/[lang]/pricing/page.tsx
git commit -m "feat: pass IP country, onetime variant IDs, and test plan config to pricing page"
```

---

### Task 5: 更新 Navbar 服务端组件（查询订阅数据）

**Files:**
- Modify: `components/common/Navbar.tsx`

- [ ] **Step 1: 替换整个文件**

将 `components/common/Navbar.tsx` 完整替换为：

```typescript
// components/common/Navbar.tsx — 服务端导航栏
// 职责：获取 Better Auth session + 订阅数据，传给 NavbarClient

import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { NavbarClient } from './NavbarClient';

interface NavbarProps {
  lang: string;
}

export async function Navbar({ lang }: NavbarProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  const user = session?.user
    ? { name: session.user.name, email: session.user.email }
    : null;

  // 查询订阅状态
  let membership: {
    variant: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null = null;

  if (session?.user) {
    const [subscription] = await db
      .select({
        variant: schema.subscriptions.variantName,
        status: schema.subscriptions.status,
        currentPeriodEnd: schema.subscriptions.currentPeriodEnd,
      })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, session.user.id));

    if (subscription && subscription.status === 'active') {
      membership = {
        variant: subscription.variant,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd
          ? subscription.currentPeriodEnd.toISOString()
          : null,
      };
    }
  }

  return <NavbarClient lang={lang} user={user} membership={membership} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add components/common/Navbar.tsx
git commit -m "feat: query subscription data in Navbar server component for membership badge"
```

---

### Task 6: 更新 NavbarClient 组件（会员标识 + Tooltip + 升级按钮）

**Files:**
- Modify: `components/common/NavbarClient.tsx`

- [ ] **Step 1: 扩展接口和数据定义**

替换 `NavbarSessionUser` 接口并添加 membership 类型和权益映射：

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { authClient } from '@/lib/auth/client';

/** 服务端传来的 session 用户数据 */
interface NavbarSessionUser {
  name?: string;
  email: string;
}

/** 会员订阅信息 */
interface MembershipData {
  variant: string;
  status: string;
  currentPeriodEnd: string | null;
}

/** 各方案的权益摘要（用于 Tooltip 展示） */
interface PlanBenefit {
  messagesKey: string;
  messagesCount?: number;
  expertsKey: string;
  depthKey: string;
  historyKey: string;
  historyCount?: number;
}

const PLAN_BENEFITS: Record<string, PlanBenefit> = {
  starter: {
    messagesKey: 'membership.benefitMessages',
    messagesCount: 30,
    expertsKey: 'membership.benefitExperts',
    depthKey: 'membership.benefitDepthLight',
    historyKey: 'membership.benefitHistoryDays',
    historyCount: 7,
  },
  pro: {
    messagesKey: 'membership.benefitMessages',
    messagesCount: 100,
    expertsKey: 'membership.benefitExpertsAll',
    depthKey: 'membership.benefitDepthStandard',
    historyKey: 'membership.benefitHistoryDays',
    historyCount: 30,
  },
  ultra: {
    messagesKey: 'membership.benefitUnlimitedMessages',
    expertsKey: 'membership.benefitExpertsAll',
    depthKey: 'membership.benefitDepthDeep',
    historyKey: 'membership.benefitHistoryForever',
  },
};

interface NavbarClientProps {
  lang: string;
  user: NavbarSessionUser | null;
  membership: MembershipData | null;
}
```

- [ ] **Step 2: 更新函数签名，添加 Tooltip 状态控制**

替换函数签名和行为局部状态：

```typescript
export function NavbarClient({ lang, user, membership }: NavbarClientProps) {
  const t = useTranslations('nav');
  const tm = useTranslations('membership');
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 3: 添加 Tooltip 关闭逻辑（点击外部 + Escape）**

在已有的 `useEffect` hooks 之后，添加 Tooltip 相关的 effect：

```typescript
  // 点击外部关闭 Tooltip
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setTooltipOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape 键关闭 Tooltip
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && tooltipOpen) {
        setTooltipOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tooltipOpen]);
```

- [ ] **Step 4: 添加会员标签颜色映射和日期格式化辅助函数**

在组件函数体内，`avatarLetter` 计算之前：

```typescript
  // 会员等级配色映射
  const variantBadgeClass: Record<string, string> = {
    starter: 'bg-gray-100 text-gray-600',
    pro: 'bg-blue-50 text-blue-600',
    ultra: 'bg-amber-50 text-amber-600',
  };

  // 格式化到期日期
  const formatDate = (iso: string | null): string => {
    if (!iso) return '--';
    return new Date(iso).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  // 获取权益摘要
  const getBenefits = (variant: string): string[] => {
    const b = PLAN_BENEFITS[variant];
    if (!b) return [];
    const benefits: string[] = [];
    if (b.messagesCount !== undefined) {
      benefits.push(tm('benefitMessages', { count: b.messagesCount }));
    } else {
      benefits.push(tm('benefitUnlimitedMessages'));
    }
    benefits.push(tm(b.expertsKey));
    benefits.push(tm(b.depthKey));
    if (b.historyCount !== undefined) {
      benefits.push(tm('benefitHistoryDays', { count: b.historyCount }));
    } else {
      benefits.push(tm('benefitHistoryForever'));
    }
    return benefits;
  };
```

- [ ] **Step 5: 在头像右侧添加会员标识/升级按钮 JSX**

在现有头像 `<button>` （第 118-126 行橙色圆形按钮）之后，在下拉菜单之前，添加会员标识。将头像区域替换为：

```tsx
          {user ? (
            /* 已登录 — 头像 + 会员标识 + 下拉菜单 */
            <div className="relative flex items-center gap-2" ref={dropdownRef}>
              {/* 会员标识 Tag — 悬停显示 Tooltip */}
              {membership && (
                <div className="relative" ref={tooltipRef}>
                  <button
                    type="button"
                    onMouseEnter={() => setTooltipOpen(true)}
                    onMouseLeave={() => setTooltipOpen(false)}
                    onClick={() => setTooltipOpen(!tooltipOpen)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-opacity hover:opacity-80 ${
                      variantBadgeClass[membership.variant] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {membership.variant}
                  </button>

                  {/* Tooltip */}
                  {tooltipOpen && (
                    <div
                      role="tooltip"
                      className="absolute right-0 top-full mt-2 w-56 rounded-[12px] bg-white p-4 shadow-soft border border-gray-100 z-50"
                    >
                      <p className="text-sm font-semibold text-text-primary capitalize">
                        {membership.variant} {tm('upgrade') === 'Upgrade' ? 'Member' : '会员'}
                      </p>
                      <div className="my-2 border-t border-gray-100" />
                      <ul className="space-y-1">
                        {getBenefits(membership.variant).map((benefit) => (
                          <li key={benefit} className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <svg className="h-3 w-3 flex-shrink-0 text-[#FF7A59]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                      <div className="my-2 border-t border-gray-100" />
                      <p className="text-xs text-text-secondary">
                        {tm('expires', { date: formatDate(membership.currentPeriodEnd) })}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 非会员 — 升级按钮 */}
              {!membership && (
                <Link
                  href={`/${lang}/pricing`}
                  className="rounded-full bg-[#FF7A59]/10 px-2.5 py-0.5 text-xs font-medium text-[#FF7A59] hover:bg-[#FF7A59]/20 transition-colors"
                >
                  {tm('upgrade')}
                </Link>
              )}

              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label={t('userMenu')}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF7A59] text-sm font-medium text-white hover:bg-[#FF7A59]/90 transition-colors"
              >
                {avatarLetter}
              </button>
```

注意：原代码中下拉菜单 `<div role="menu">` 在 `<button>` 之后，保持不变。现在需要在头像 button 外面包一个包含会员标识的 flex 容器。完整结构：

```
<div className="relative flex items-center gap-2" ref={dropdownRef}>
  {membership ? <会员Tag+Tooltip> : <升级Link>}
  <头像button>
  {dropdownOpen && <下拉菜单>}
</div>
```

- [ ] **Step 6: 验证 TypeScript 编译**

运行：`npx tsc --noEmit 2>&1 | head -30`
预期输出：无错误

- [ ] **Step 7: Commit**

```bash
git add components/common/NavbarClient.tsx
git commit -m "feat: add membership badge with tooltip and upgrade button to NavbarClient"
```

---

### Task 7: 更新 .env.local.example 添加新环境变量

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: 添加新的环境变量占位**

在 `.env.local.example` 的 LemonSqueezy 配置区域，添加：

```
# LemonSqueezy — 一次性买断 Variant IDs（国内用户）
LEMONSQUEEZY_VARIANT_STARTER_ONETIME=
LEMONSQUEEZY_VARIANT_PRO_ONETIME=
LEMONSQUEEZY_VARIANT_ULTRA_ONETIME=

# LemonSqueezy — $0.01 测试方案 Variant ID
LEMONSQUEEZY_VARIANT_TEST=

# 显隐控制
NEXT_PUBLIC_SHOW_TEST_PLAN=false
```

- [ ] **Step 2: Commit**

```bash
git add .env.local.example
git commit -m "feat: add onetime and test plan env var placeholders to .env.local.example"
```

---

### Task 8: 构建验证 + 手动测试

- [ ] **Step 1: 构建项目**

运行：`npm run build`
预期输出：构建成功，无错误

- [ ] **Step 2: 启动开发服务器**

运行：`npm run dev`
然后访问：
- `/zh/pricing` — 验证国内一次性支付模式
- `/en/pricing` — 验证国外订阅制 + 按钮切换 + 年费折算
- 登录会员账号 — 验证导航栏会员 Tag + Tooltip
- 登录非会员账号 — 验证导航栏"升级"按钮
- 设置 `NEXT_PUBLIC_SHOW_TEST_PLAN=true` 后重启 — 验证测试方案卡片

- [ ] **Step 3: 运行测试套件**

运行：`npm test`
预期输出：所有测试通过

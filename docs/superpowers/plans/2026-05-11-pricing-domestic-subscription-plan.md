# 定价页国内订阅制改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将定价页国内用户从一次性买断改为订阅制（手动续费），优化年付卡片展示

**Architecture:** 前端组件重构 — PricingPage 根据 IP 提供国内/国外 Variant ID，PricingSection 移除买断 UI 门控，PricingCard 移除 isOneTime 逻辑并重写年付价格展示

**Tech Stack:** Next.js 16, React 19, TypeScript 6, tailwindcss 4, next-intl

---

### Task 1: 更新环境变量模板

**Files:**
- Modify: `.env.local.example:32-36`

- [ ] **Step 1: 将 3 个 ONETIME 变量替换为 6 个 DOMESTIC 变量**

```diff
-# LemonSqueezy — 一次性买断 Variant IDs（国内用户）
-LEMONSQUEEZY_VARIANT_STARTER_ONETIME=
-LEMONSQUEEZY_VARIANT_PRO_ONETIME=
-LEMONSQUEEZY_VARIANT_ULTRA_ONETIME=
+# LemonSqueezy — 国内用户专用 Variant IDs（月付/年付，需手动续费）
+LEMONSQUEEZY_VARIANT_STARTER_MONTHLY_DOMESTIC=
+LEMONSQUEEZY_VARIANT_STARTER_YEARLY_DOMESTIC=
+LEMONSQUEEZY_VARIANT_PRO_MONTHLY_DOMESTIC=
+LEMONSQUEEZY_VARIANT_PRO_YEARLY_DOMESTIC=
+LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY_DOMESTIC=
+LEMONSQUEEZY_VARIANT_ULTRA_YEARLY_DOMESTIC=
```

- [ ] **Step 2: 提交**

```bash
git add .env.local.example
git commit -m "feat: replace onetime variant IDs with domestic monthly/yearly variants in env template"
```

---

### Task 2: 更新国际化文案

**Files:**
- Modify: `messages/en.json:293-298`（pricing.savePerYear、pricing.oneTime、pricing.validDays）
- Modify: `messages/en.json:303`（membership.oneTimeExpires）
- Modify: `messages/zh.json:293-298`（同上）
- Modify: `messages/zh.json:303`（同上）

- [ ] **Step 1: 修改英文文案**

`messages/en.json` — 改 `savePerYear` 为百分比，删除 `oneTime`、`validDays`、`oneTimeExpires`：

```diff
-    "savePerYear": "Save ${{amount}}/yr vs monthly",
+    "savePerYear": "Save {{percent}}%",
-    "oneTime": "One-time payment",
-    "validDays": "Valid {{days}} days"
```

```diff
-    "oneTimeExpires": "Valid until: {{date}}",
```

- [ ] **Step 2: 修改中文文案**

`messages/zh.json` — 同上：

```diff
-    "savePerYear": "比月付省 ${{amount}}/年",
+    "savePerYear": "省 {{percent}}%",
-    "oneTime": "一次性付费",
-    "validDays": "{{days}} 天有效"
```

```diff
-    "oneTimeExpires": "有效至：{{date}}",
```

- [ ] **Step 3: 提交**

```bash
git add messages/en.json messages/zh.json
git commit -m "feat: update savePerYear to percentage, remove oneTime i18n keys"
```

---

### Task 3: 重构 PricingCard — 移除买断逻辑，优化年付展示

**Files:**
- Modify: `components/pricing/PricingCard.tsx`

- [ ] **Step 1: 更新 PlanData 接口，移除买断字段**

```diff
 interface PlanData {
   id: string;
   name: string;
   monthlyPrice: number;
   yearlyPrice: number;
-  onetimePrice: number;  // 国内一次性买断价格
   features: string[];
   highlighted?: boolean;
-  validDays?: number; // 一次性买断的有效天数
 }
```

- [ ] **Step 2: 更新 PricingCardProps 接口，移除 isOneTime**

```diff
 interface PricingCardProps {
   plan: PlanData;
   isYearly: boolean;
-  isOneTime: boolean;   // 国内一次性买断模式
   isTestPlan: boolean;   // $0.01 测试方案
   isLoggedIn: boolean;
   variantId: string;
   lang: string;
 }
```

- [ ] **Step 3: 更新组件实现 — 移除 isOneTime，重写价格展示逻辑**

将 `PricingCard` 函数体的价格逻辑段整体替换：

```diff
 export function PricingCard({ plan, isYearly, isOneTime, isTestPlan, isLoggedIn, variantId, lang }: PricingCardProps) {
   const router = useRouter();
   const tp = useTranslations('pricing');

-  // 折算月费（年费 ÷ 12）
   const monthlyEquivalent = (plan.yearlyPrice / 12).toFixed(2);
-  // 年付比月付节省的金额
-  const yearlySaving = plan.monthlyPrice * 12 - plan.yearlyPrice;
+  // 年付比月付节省的百分比
+  const savePercent = Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100);

-  // 确定展示价格和周期
-  const displayPrice = isOneTime
-    ? plan.onetimePrice    // 国内：展示一次性买断价格
-    : isYearly
-      ? monthlyEquivalent  // 国外年付：展示折算月费
-      : plan.monthlyPrice; // 国外月付：展示月费
+  // 展示价格：年付显示折算月费，月付显示月费
+  const displayPrice = isYearly ? monthlyEquivalent : plan.monthlyPrice;

-  const periodLabel = isOneTime
-    ? ''                   // 一次性：无周期标注
-    : `/${tp('month')}`;
+  const periodLabel = `/${tp('month')}`;
```

- [ ] **Step 4: 替换一次性付费标注 + 年付展示区域**

```diff
-      {/* 一次性付费标注 */}
-      {isOneTime && plan.validDays && (
-        <p className="mt-1 text-xs text-[#FF7A59]">
-          {tp('validDays', { days: plan.validDays })}
-        </p>
-      )}
-
-      {/* 年付折算：显示年费总额 + 省钱标注 */}
-      {isYearly && !isOneTime && (
-        <div className="mt-1">
-          <p className="text-xs text-text-secondary">
-            ${plan.yearlyPrice}/{tp('year')}
-          </p>
-          <p className="text-xs text-[#FF7A59]">
-            {tp('savePerYear', { amount: yearlySaving })}
-          </p>
-        </div>
-      )}
+      {/* 年付省钱展示：原月费删除线 + 省钱百分比 */}
+      {isYearly && (
+        <div className="mt-1 flex items-center gap-1.5">
+          <span className="text-xs text-text-secondary line-through">
+            ${plan.monthlyPrice}/{tp('month')}
+          </span>
+          <span className="text-xs text-[#FF7A59] font-medium">
+            {tp('savePerYear', { percent: savePercent })}
+          </span>
+        </div>
+      )}
```

- [ ] **Step 5: 更新导出函数签名，移除 isOneTime 参数**

```diff
-export function PricingCard({ plan, isYearly, isOneTime, isTestPlan, isLoggedIn, variantId, lang }: PricingCardProps) {
+export function PricingCard({ plan, isYearly, isTestPlan, isLoggedIn, variantId, lang }: PricingCardProps) {
```

- [ ] **Step 6: 提交**

```bash
git add components/pricing/PricingCard.tsx
git commit -m "feat: remove isOneTime logic, show strikethrough monthly price + save% on yearly cards"
```

---

### Task 4: 重构 PricingSection — 移除买断 UI 门控，国内使用订阅变体

**Files:**
- Modify: `components/pricing/PricingSection.tsx`

- [ ] **Step 1: 更新 variantIds 接口，替换 onetime 为 domestic**

```diff
 interface PricingSectionProps {
   lang: string;
   isLoggedIn: boolean;
-  isDomestic: boolean;       // 国内用户 = 一次性买断
+  isDomestic: boolean;       // 国内用户使用国内专用 Variant ID
   showTestPlan: boolean;     // 显示 $0.01 测试方案
   variantIds: {
     starterMonthly: string;
     starterYearly: string;
     proMonthly: string;
     proYearly: string;
     ultraMonthly: string;
     ultraYearly: string;
-    starterOnetime: string;
-    proOnetime: string;
-    ultraOnetime: string;
+    starterMonthlyDomestic: string;
+    starterYearlyDomestic: string;
+    proMonthlyDomestic: string;
+    proYearlyDomestic: string;
+    ultraMonthlyDomestic: string;
+    ultraYearlyDomestic: string;
     test: string;
   };
 }
```

- [ ] **Step 2: 更新 plans 数组 — 移除买断字段，新增国内变体**

```diff
   const plans = [
     {
       id: 'starter',
       name: 'Starter',
       monthlyPrice: 9,
       yearlyPrice: 99,
-      onetimePrice: 99,
-      validDays: 30,
       variantIdMonthly: variantIds.starterMonthly,
       variantIdYearly: variantIds.starterYearly,
-      variantIdOnetime: variantIds.starterOnetime,
+      variantIdDomesticMonthly: variantIds.starterMonthlyDomestic,
+      variantIdDomesticYearly: variantIds.starterYearlyDomestic,
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
-      onetimePrice: 319,
-      validDays: 30,
       highlighted: true,
       variantIdMonthly: variantIds.proMonthly,
       variantIdYearly: variantIds.proYearly,
-      variantIdOnetime: variantIds.proOnetime,
+      variantIdDomesticMonthly: variantIds.proMonthlyDomestic,
+      variantIdDomesticYearly: variantIds.proYearlyDomestic,
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
-      onetimePrice: 539,
-      validDays: 30,
       variantIdMonthly: variantIds.ultraMonthly,
       variantIdYearly: variantIds.ultraYearly,
-      variantIdOnetime: variantIds.ultraOnetime,
+      variantIdDomesticMonthly: variantIds.ultraMonthlyDomestic,
+      variantIdDomesticYearly: variantIds.ultraYearlyDomestic,
       features: [
         tp('features.unlimitedMessages'),
         tp('features.expertsAll'),
         tp('features.historyForever'),
         tp('features.effectDeep'),
       ],
     },
   ];
```

- [ ] **Step 3: 移除月/年切换的 isDomestic 门控**

```diff
-      {/* 月付/年付按钮切换 — 仅国外订阅制用户可见 */}
-      {!isDomestic && (
+      {/* 月付/年付按钮切换 */}
       <div className="mt-8 flex items-center justify-center">
         ...（内容不变）
       </div>
-      )}
```

- [ ] **Step 4: 删除国内模式提示文字**

```diff
-      {/* 国内模式提示 */}
-      {isDomestic && (
-        <p className="mt-6 text-center text-sm text-text-secondary">
-          {tp('oneTime')}
-        </p>
-      )}
```

- [ ] **Step 5: 更新变体选择逻辑和 PricingCard props**

```diff
         {plans.map((plan) => {
-          const cardVariantId = isDomestic
-            ? plan.variantIdOnetime
-            : isYearly
-              ? plan.variantIdYearly
-              : plan.variantIdMonthly;
+          const cardVariantId = isDomestic
+            ? (isYearly ? plan.variantIdDomesticYearly : plan.variantIdDomesticMonthly)
+            : (isYearly ? plan.variantIdYearly : plan.variantIdMonthly);

           return (
             <PricingCard
               key={plan.id}
               plan={plan}
               isYearly={isYearly}
-              isOneTime={isDomestic}
               isTestPlan={false}
               isLoggedIn={isLoggedIn}
               variantId={cardVariantId}
               lang={lang}
             />
           );
         })}
```

- [ ] **Step 6: 更新测试方案卡片 — 移除 onetimePrice**

```diff
           <PricingCard
             plan={{
               id: 'test',
               name: tp('testPlanName'),
               monthlyPrice: 0.01,
               yearlyPrice: 0.01,
-              onetimePrice: 0.01,
               features: [
                 tp('features.dailyMessages', { count: 30 }),
                 tp('features.expertsStarter'),
                 tp('features.historyDays', { count: 7 }),
                 tp('features.effectLight'),
               ],
             }}
             isYearly={false}
-            isOneTime={false}
             isTestPlan={true}
             isLoggedIn={isLoggedIn}
             variantId={variantIds.test}
             lang={lang}
           />
```

- [ ] **Step 7: 提交**

```bash
git add components/pricing/PricingSection.tsx
git commit -m "feat: use domestic variant IDs for domestic users, remove onetime UI gating"
```

---

### Task 5: 更新 PricingPage 服务端组件

**Files:**
- Modify: `app/[lang]/pricing/page.tsx`

- [ ] **Step 1: 替换 variantIds 对象中的 onetime 变量为 domestic 变量**

```diff
   const variantIds = {
     starterMonthly: process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY || '',
     starterYearly: process.env.LEMONSQUEEZY_VARIANT_STARTER_YEARLY || '',
     proMonthly: process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY || '',
     proYearly: process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY || '',
     ultraMonthly: process.env.LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY || '',
     ultraYearly: process.env.LEMONSQUEEZY_VARIANT_ULTRA_YEARLY || '',
-    starterOnetime: process.env.LEMONSQUEEZY_VARIANT_STARTER_ONETIME || '',
-    proOnetime: process.env.LEMONSQUEEZY_VARIANT_PRO_ONETIME || '',
-    ultraOnetime: process.env.LEMONSQUEEZY_VARIANT_ULTRA_ONETIME || '',
+    starterMonthlyDomestic: process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY_DOMESTIC || '',
+    starterYearlyDomestic: process.env.LEMONSQUEEZY_VARIANT_STARTER_YEARLY_DOMESTIC || '',
+    proMonthlyDomestic: process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY_DOMESTIC || '',
+    proYearlyDomestic: process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY_DOMESTIC || '',
+    ultraMonthlyDomestic: process.env.LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY_DOMESTIC || '',
+    ultraYearlyDomestic: process.env.LEMONSQUEEZY_VARIANT_ULTRA_YEARLY_DOMESTIC || '',
     test: process.env.LEMONSQUEEZY_VARIANT_TEST || '',
   };
```

- [ ] **Step 2: 提交**

```bash
git add app/[lang]/pricing/page.tsx
git commit -m "feat: pass domestic monthly/yearly variant IDs to pricing page"
```

---

### Task 6: 验证构建

**Files:**
- 无（只读检查）

- [ ] **Step 1: 运行 TypeScript 类型检查**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: 无类型错误。

- [ ] **Step 2: 运行现有测试**

```bash
npm test 2>&1
```

Expected: 所有测试通过。

- [ ] **Step 3: 运行构建**

```bash
npm run build 2>&1 | tail -20
```

Expected: 构建成功，无报错。

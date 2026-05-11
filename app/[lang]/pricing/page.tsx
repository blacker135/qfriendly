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
    starterMonthlyDomestic: process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY_DOMESTIC || '',
    starterYearlyDomestic: process.env.LEMONSQUEEZY_VARIANT_STARTER_YEARLY_DOMESTIC || '',
    proMonthlyDomestic: process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY_DOMESTIC || '',
    proYearlyDomestic: process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY_DOMESTIC || '',
    ultraMonthlyDomestic: process.env.LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY_DOMESTIC || '',
    ultraYearlyDomestic: process.env.LEMONSQUEEZY_VARIANT_ULTRA_YEARLY_DOMESTIC || '',
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

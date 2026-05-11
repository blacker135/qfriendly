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

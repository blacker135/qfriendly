// scripts/create-admin.ts
// 创建管理员账号脚本
// 使用方式：npx tsx scripts/create-admin.ts

import { db, schema } from '../lib/db';
import { eq } from 'drizzle-orm';

async function createAdmin() {
  const email = 'blacker_admin@lunara.admin';

  const [existing] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, email));

  const userId = existing?.id;

  if (!userId) {
    console.error('管理员用户不存在。请先在应用中注册 blacker_admin@lunara.admin 账号。');
    process.exit(1);
  }

  const [existingSub] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, userId));

  if (existingSub) {
    await db
      .update(schema.subscriptions)
      .set({ variantName: 'admin', status: 'active', updatedAt: new Date() })
      .where(eq(schema.subscriptions.userId, userId));
    console.log('管理员订阅已更新为 admin 等级。');
  } else {
    await db.insert(schema.subscriptions).values({
      userId,
      paypalSubscriptionId: `admin_${userId}`,
      paypalPlanId: 'admin_plan',
      variantName: 'admin',
      status: 'active',
    });
    console.log('管理员订阅已创建。');
  }
}

createAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

// scripts/create-admin.ts
// 创建管理员账号脚本（注册用户 + 设置密码 + 授予 admin 订阅权限）
// 使用方式：DATABASE_URL="postgresql://..." npx tsx scripts/create-admin.ts
//
// 使用与 Better Auth 相同的 scrypt 密码哈希算法，确保兼容性
// 密码哈希格式：salt:hashedKey（均为 hex 编码）

import { randomBytes, scrypt } from 'node:crypto';
import { db, schema } from '../lib/db';
import { eq } from 'drizzle-orm';

// ============================================================
// 管理员配置
// ============================================================
const ADMIN_EMAIL = 'admin_blacker@qfriendly.quan';
const ADMIN_PASSWORD = 'blacker_admin123';
const ADMIN_NAME = 'Admin Blacker';

// ============================================================
// scrypt 哈希配置（与 Better Auth / @better-auth/utils 保持一致）
// ============================================================
const SCRYPT_CONFIG = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
  maxmem: 128 * 16384 * 16 * 2, // 128 * N * r * 2
};

/**
 * 生成 32 位随机字母数字 ID（与 Better Auth generateId 一致）
 * 字符集：a-z, A-Z, 0-9
 */
function generateId(size: number = 32): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = randomBytes(size);
  let result = '';
  for (let i = 0; i < size; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * 使用 scrypt 哈希密码（与 Better Auth hashPassword 完全一致）
 * 返回格式：十六进制 salt:十六进制密钥
 */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return new Promise<string>((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      SCRYPT_CONFIG.dkLen,
      {
        N: SCRYPT_CONFIG.N,
        r: SCRYPT_CONFIG.r,
        p: SCRYPT_CONFIG.p,
        maxmem: SCRYPT_CONFIG.maxmem,
      },
      (err, key) => {
        if (err) reject(err);
        else resolve(`${salt}:${key.toString('hex')}`);
      }
    );
  });
}

// ============================================================
// 主流程
// ============================================================
async function createAdmin() {
  console.log('=== QFriendly 管理员账号创建工具 ===\n');

  // 1. 检查用户是否已存在
  const [existingUser] = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, ADMIN_EMAIL));

  let userId: string;

  if (existingUser) {
    console.log(`✓ 用户 ${ADMIN_EMAIL} 已存在，跳过注册步骤。`);
    userId = existingUser.id;
  } else {
    // 2. 创建用户记录
    console.log(`→ 正在注册用户：${ADMIN_EMAIL} ...`);
    userId = generateId();
    const now = new Date();

    await db.insert(schema.user).values({
      id: userId,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      emailVerified: true, // 管理员邮箱默认已验证
      createdAt: now,
      updatedAt: now,
    });
    console.log(`✓ 用户已创建（id: ${userId}）`);

    // 3. 创建密码账户记录（provider: credential）
    console.log('→ 正在设置密码...');
    const hashedPassword = await hashPassword(ADMIN_PASSWORD);

    await db.insert(schema.account).values({
      id: generateId(),
      accountId: userId, // Better Auth 使用 userId 作为 accountId
      providerId: 'credential',
      userId: userId,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });
    console.log('✓ 密码已设置（scrypt 哈希）');
  }

  // 4. 设置管理员订阅权限
  console.log('→ 正在设置管理员权限...');
  const [existingSub] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, userId));

  if (existingSub) {
    await db
      .update(schema.subscriptions)
      .set({
        variantName: 'admin',
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.userId, userId));
    console.log('✓ 管理员订阅已更新为 admin 等级。');
  } else {
    await db.insert(schema.subscriptions).values({
      userId,
      paypalSubscriptionId: `admin_${userId}`,
      paypalPlanId: 'admin_plan',
      variantName: 'admin',
      status: 'active',
    });
    console.log('✓ 管理员订阅已创建（admin 等级）。');
  }

  console.log('\n=== 管理员账号创建完成 ===');
  console.log(`   邮箱：${ADMIN_EMAIL}`);
  console.log(`   密码：${ADMIN_PASSWORD}`);
  console.log(`   权限：admin（超级管理员）\n`);
}

createAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ 创建管理员失败：', err);
    process.exit(1);
  });

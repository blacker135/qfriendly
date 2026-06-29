/**
 * scripts/activate-paypal-plans.ts
 * 批量激活 PayPal 订阅计划
 *
 * 问题背景：PayPal plans 创建后默认处于 CREATED 状态，
 * 必须手动激活为 ACTIVE 状态才能创建订阅。
 * PayPal REST API: POST /v1/billing/plans/{plan_id}/activate
 *
 * 使用方式：npx tsx scripts/activate-paypal-plans.ts
 * 需要 PAYPAL_CLIENT_ID 和 PAYPAL_SECRET 环境变量
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

// 加载 .env.local 环境变量（ESM 兼容：使用 import.meta.url 替代 __dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const PAYPAL_API_BASE = 'https://api-m.paypal.com';

/** 需要激活的 plan IDs，从环境变量读取 */
const PLAN_IDS = [
  process.env.PAYPAL_PLAN_START_MONTHLY,
  process.env.PAYPAL_PLAN_START_YEARLY,
  process.env.PAYPAL_PLAN_PRO_MONTHLY,
  process.env.PAYPAL_PLAN_PRO_YEARLY,
  process.env.PAYPAL_PLAN_ULTRA_MONTHLY,
  process.env.PAYPAL_PLAN_ULTRA_YEARLY,
  process.env.PAYPAL_PLAN_TEST,
].filter(Boolean) as string[];

/** Plan ID → 名称映射（便于日志显示） */
const PLAN_NAMES: Record<string, string> = {
  [process.env.PAYPAL_PLAN_START_MONTHLY || '']: 'Start Monthly',
  [process.env.PAYPAL_PLAN_START_YEARLY || '']: 'Start Yearly',
  [process.env.PAYPAL_PLAN_PRO_MONTHLY || '']: 'Pro Monthly',
  [process.env.PAYPAL_PLAN_PRO_YEARLY || '']: 'Pro Yearly',
  [process.env.PAYPAL_PLAN_ULTRA_MONTHLY || '']: 'Ultra Monthly',
  [process.env.PAYPAL_PLAN_ULTRA_YEARLY || '']: 'Ultra Yearly',
  [process.env.PAYPAL_PLAN_TEST || '']: 'Test',
};

interface PayPalToken {
  access_token: string;
  expires_at: number;
}

let cachedToken: PayPalToken | null = null;

/**
 * 获取 PayPal OAuth 访问令牌
 */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access_token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  if (!clientId || !secret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_SECRET must be set in .env.local');
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`PayPal OAuth error: ${res.status} ${errBody}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.access_token;
}

/**
 * 激活单个 PayPal Plan
 * POST /v1/billing/plans/{plan_id}/activate
 */
async function activatePlan(planId: string): Promise<boolean> {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans/${planId}/activate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  // 204 No Content 表示成功
  if (res.status === 204) {
    return true;
  }

  // 如果已经是 ACTIVE 状态，算作成功
  const body = await res.json().catch(() => ({}));
  if (body.name === 'PLAN_ALREADY_ACTIVE') {
    return true;
  }

  console.error(`  ❌ HTTP ${res.status}:`, JSON.stringify(body));
  return false;
}

/**
 * 查询 Plan 当前状态
 */
async function getPlanStatus(planId: string): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v1/billing/plans/${planId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return 'UNKNOWN';
  const body = await res.json();
  return body.status || 'UNKNOWN';
}

async function main() {
  console.log('💚 QFriendly — PayPal Plan 激活工具\n');
  console.log(`API 环境：${PAYPAL_API_BASE}`);
  console.log(`待激活计划数：${PLAN_IDS.length}\n`);

  if (PLAN_IDS.length === 0) {
    console.error('❌ 未找到任何 Plan ID，请检查 .env.local 中的 PayPal Plan 环境变量');
    process.exit(1);
  }

  // 先查询所有计划状态
  console.log('📋 查询计划当前状态...\n');
  for (const planId of PLAN_IDS) {
    const name = PLAN_NAMES[planId] || planId;
    const status = await getPlanStatus(planId);
    console.log(`  ${status === 'ACTIVE' ? '✅' : '⚠️'} ${name}: ${status}`);
  }

  console.log('\n🚀 开始激活非 ACTIVE 状态的计划...\n');

  let successCount = 0;
  let failCount = 0;

  for (const planId of PLAN_IDS) {
    const name = PLAN_NAMES[planId] || planId;
    const status = await getPlanStatus(planId);

    if (status === 'ACTIVE') {
      console.log(`  ✅ ${name}: 已激活，跳过`);
      successCount++;
      continue;
    }

    console.log(`  🔄 ${name} (${planId}): 正在激活...`);
    const ok = await activatePlan(planId);
    if (ok) {
      console.log(`  ✅ ${name}: 激活成功`);
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n--- 激活完成 ---`);
  console.log(`✅ 成功: ${successCount}`);
  if (failCount > 0) {
    console.log(`❌ 失败: ${failCount}`);
  }

  // 再次查询确认
  console.log('\n📋 最终状态确认...\n');
  for (const planId of PLAN_IDS) {
    const name = PLAN_NAMES[planId] || planId;
    const status = await getPlanStatus(planId);
    console.log(`  ${status === 'ACTIVE' ? '✅' : '❌'} ${name}: ${status}`);
  }

  if (failCount > 0) {
    console.error('\n⚠️ 部分计划激活失败。请检查：');
    console.error('  1. PayPal 账户是否已完成 Business 认证');
    console.error('  2. Plan ID 是否正确');
    console.error('  3. 登录 https://www.paypal.com/billing/plans 手动检查');
    process.exit(1);
  }

  console.log('\n🎉 所有计划已激活，用户可以正常订阅了！');
}

main();

// lib/lemonsqueezy/index.ts
// LemonSqueezy 模块公共导出 + Variant 映射 + Webhook 签名验证

import crypto from 'crypto';

/**
 * 面向业务的订阅等级名称
 */
export type VariantName = 'starter' | 'pro' | 'ultra';

/**
 * LS Variant ID → 等级名称 的映射表
 * 在首次调用 getVariantName 时延迟初始化，确保环境变量已加载
 */
const VARIANT_MAP: Record<string, VariantName> = {};

/**
 * 从环境变量构建 Variant 映射
 * 仅执行一次（首次调用 getVariantName 时触发）
 */
function initVariantMap() {
  const pairs: [string | undefined, VariantName][] = [
    // 国外（自动续费）
    [process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY, 'starter'],
    [process.env.LEMONSQUEEZY_VARIANT_STARTER_YEARLY, 'starter'],
    [process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY, 'pro'],
    [process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY, 'pro'],
    [process.env.LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY, 'ultra'],
    [process.env.LEMONSQUEEZY_VARIANT_ULTRA_YEARLY, 'ultra'],
    // 国内（手动续费）
    [process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY_DOMESTIC, 'starter'],
    [process.env.LEMONSQUEEZY_VARIANT_STARTER_YEARLY_DOMESTIC, 'starter'],
    [process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY_DOMESTIC, 'pro'],
    [process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY_DOMESTIC, 'pro'],
    [process.env.LEMONSQUEEZY_VARIANT_ULTRA_MONTHLY_DOMESTIC, 'ultra'],
    [process.env.LEMONSQUEEZY_VARIANT_ULTRA_YEARLY_DOMESTIC, 'ultra'],
    // 测试方案
    [process.env.LEMONSQUEEZY_VARIANT_TEST, 'starter'],
  ];
  for (const [id, name] of pairs) {
    if (id) VARIANT_MAP[id] = name;
  }
}

/**
 * 根据 LS Variant ID 查询对应的订阅等级
 * @param variantId - LS 产品变体 ID（来自 webhook 或 checkout）
 * @returns 等级名称，若未匹配则返回 null
 */
export function getVariantName(variantId: string): VariantName | null {
  if (Object.keys(VARIANT_MAP).length === 0) initVariantMap();
  return VARIANT_MAP[variantId] || null;
}

/**
 * 验证 LemonSqueezy Webhook 签名
 * 使用 HMAC-SHA256 对比请求体摘要，防止伪造回调
 * @param rawBody - 原始请求体字符串
 * @param signature - X-Signature 头中的签名值
 * @returns true 表示签名有效
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_SIGNING_SECRET;
  if (!secret) {
    console.error('LEMONSQUEEZY_SIGNING_SECRET not configured');
    return false;
  }
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const digest = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export { createCheckout } from './client';

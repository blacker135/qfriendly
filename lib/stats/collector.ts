// lib/stats/collector.ts
// 数据统计引擎 — 事件采集器
// 在业务关键节点异步记录原始事件，不阻塞主流程

import { db } from '@/lib/db';
import { analyticsEvents } from './schema';

/** 事件类型 */
export type EventType =
  | 'page_view'
  | 'message_sent'
  | 'auth_login'
  | 'auth_register'
  | 'subscription_change'
  | 'payment_completed'
  | 'heartbeat'; // 新增：心跳事件（为 B.3 做准备）

/** 事件记录参数 */
interface TrackEventParams {
  eventType: EventType;
  userId?: string;
  payload?: Record<string, unknown>;
}

/**
 * 记录一条分析事件（异步，不阻塞主流程）
 * 调用方无需 await，fire-and-forget
 */
export function trackEvent(params: TrackEventParams): void {
  const { eventType, userId, payload = {} } = params;
  db.insert(analyticsEvents)
    .values({
      eventType,
      userId: userId ?? null,
      payload: payload as any,
    })
    .execute()
    .catch((err) => {
      console.error('[StatsCollector] 事件记录失败:', eventType, err);
    });
}

/** 页面访问快捷方法（自动携带 anonymous_id） */
export function trackPageView(path: string, userId?: string, referrer?: string): void {
  // 从浏览器 cookie 中读取匿名访客标识（仅客户端可用）
  let anonymousId = '';
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)qf_anonymous_id=([^;]*)/);
    anonymousId = match ? match[1] : '';
  }
  trackEvent({
    eventType: 'page_view',
    userId,
    payload: { path, referrer: referrer ?? '', anonymous_id: anonymousId },
  });
}

/** 消息发送快捷方法 */
export function trackMessageSent(
  userId: string,
  conversationId: string,
  expert: string,
  language: string
): void {
  trackEvent({
    eventType: 'message_sent',
    userId,
    payload: { conversationId, expert, language },
  });
}

/** 登录快捷方法 */
export function trackAuthLogin(userId: string): void {
  trackEvent({ eventType: 'auth_login', userId });
}

/** 注册快捷方法 */
export function trackAuthRegister(userId: string): void {
  trackEvent({ eventType: 'auth_register', userId });
}

/** 订阅变更快捷方法 */
export function trackSubscriptionChange(
  userId: string,
  subscriptionId: string,
  variantName: string,
  status: string
): void {
  trackEvent({
    eventType: 'subscription_change',
    userId,
    payload: { subscriptionId, variantName, status },
  });
}

/** 支付成功快捷方法 */
export function trackPaymentCompleted(
  userId: string,
  subscriptionId: string,
  amount: number
): void {
  trackEvent({
    eventType: 'payment_completed',
    userId,
    payload: { subscriptionId, amount },
  });
}

'use client';

// ============================================================
// components/chat/HeartbeatPulse.tsx — 心跳脉冲组件
// ============================================================
// 功能：
//   - 定时向 /api/analytics/heartbeat 上报会话活跃状态
//   - 首次加载立即发送，之后每 10 分钟发送一次
//   - 从 cookie 中读取 qf_anonymous_id
//   - 不渲染任何 UI，仅作为副作用存在
// ============================================================

import { useEffect } from 'react';

/** 心跳间隔：10 分钟 */
const HEARTBEAT_INTERVAL = 10 * 60 * 1000;

/**
 * HeartbeatPulse — 会话心跳脉冲
 * 嵌入聊天布局中，自动管理会话生命周期
 */
export default function HeartbeatPulse() {
  useEffect(() => {
    let sessionId: string | null = null;

    /**
     * 发送单次心跳请求
     * 首次成功时保存服务端返回的 sessionId
     */
    const heartbeat = async () => {
      const anonId = document.cookie.match(/(?:^|;\s*)qf_anonymous_id=([^;]*)/)?.[1] || '';
      try {
        const res = await fetch('/api/analytics/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            anonymousId: anonId,
            path: window.location.pathname,
          }),
        });
        if (!sessionId) {
          const data = await res.json();
          if (data.sessionId) {
            sessionId = data.sessionId;
          }
        }
      } catch {
        // 静默失败，不影响用户体验
      }
    };

    // 首次立即发送心跳
    heartbeat();

    // 定时发送
    const timer = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    // 清理定时器
    return () => clearInterval(timer);
  }, []);

  return null; // 不渲染任何 UI
}

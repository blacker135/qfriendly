// ============================================================
// app/api/analytics/heartbeat/route.ts — 会话心跳上报 API
// ============================================================
// POST /api/analytics/heartbeat
// 创建或更新用户会话，记录设备类型、地域信息
// ============================================================

import { db, schema } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * 心跳上报
 * 接收 { sessionId, anonymousId, path }，创建新会话或更新已有会话的心跳时间
 */
export async function POST(req: NextRequest) {
  const { sessionId, anonymousId, path } = await req.json();

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const userId = session?.user?.id ?? null;

    // 检测设备类型
    const ua = req.headers.get('user-agent') || '';
    let deviceType = 'desktop';
    if (/Mobile|Android|iPhone/.test(ua)) deviceType = 'mobile';
    else if (/iPad|Tablet/.test(ua)) deviceType = 'tablet';

    // 检测国家（通过 Vercel 的 x-vercel-ip-country header）
    const country = req.headers.get('x-vercel-ip-country') || '';

    if (sessionId) {
      // 更新已有会话的心跳时间
      await db.update(schema.sessions)
        .set({ lastHeartbeatAt: new Date(), userId: userId ?? undefined })
        .where(and(eq(schema.sessions.id, sessionId), isNull(schema.sessions.endedAt)));
    } else {
      // 创建新会话
      const [newSession] = await db.insert(schema.sessions)
        .values({
          userId,
          anonymousId: anonymousId || null,
          deviceType,
          country,
        })
        .returning({ id: schema.sessions.id });

      return NextResponse.json({ sessionId: newSession.id });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Heartbeat] 心跳上报失败:', error);
    return NextResponse.json({ error: '心跳上报失败' }, { status: 500 });
  }
}

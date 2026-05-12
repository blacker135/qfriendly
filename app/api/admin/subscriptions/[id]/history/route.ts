// app/api/admin/subscriptions/[id]/history/route.ts
// GET /api/admin/subscriptions/:id/history — 查看订阅变更日志

import { getAdminUserId } from '@/lib/admin/guard';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    // 从 JSONB payload 中按 subscriptionId 过滤，按时间倒序
    const events = await db.execute<{
      id: string; event_type: string; user_id: string;
      payload: Record<string, unknown>; created_at: string;
    }>(
      sql`SELECT * FROM analytics_events
          WHERE event_type = 'subscription_change'
            AND payload->>'subscriptionId' = ${id}
          ORDER BY created_at DESC
          LIMIT 100`
    );

    const history = events.rows.map((e) => ({
      id: e.id,
      eventType: e.event_type,
      userId: e.user_id,
      payload: e.payload,
      createdAt: e.created_at,
    }));

    return NextResponse.json(history);
  } catch (error) {
    console.error('[AdminSubscriptions] 获取变更日志失败:', error);
    return NextResponse.json({ error: '获取变更日志失败' }, { status: 500 });
  }
}

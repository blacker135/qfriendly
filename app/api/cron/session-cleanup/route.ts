// app/api/cron/session-cleanup/route.ts
// GET /api/cron/session-cleanup — Vercel Cron Job 超时会话清理
// 每 30 分钟自动调用，关闭 last_heartbeat_at 超过 30 分钟且未结束的会话，
// 并计算实际会话时长写入 duration_seconds

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

/** Vercel Cron Job 验证密钥，通过 Authorization header 传递 */
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/session-cleanup
 * Vercel Cron Job 入口，每 30 分钟自动调用。
 * 验证 CRON_SECRET 后关闭超时会话。
 */
export async function GET(request: Request) {
  // Vercel Cron Jobs 通过 Authorization header 传递 secret
  const authHeader = request.headers.get('Authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 关闭 30 分钟无心跳的会话，计算时长
    const result = await db.execute(sql`
      UPDATE sessions
      SET
        ended_at = last_heartbeat_at + INTERVAL '30 minutes',
        duration_seconds = EXTRACT(EPOCH FROM (last_heartbeat_at - started_at))::int
      WHERE ended_at IS NULL
        AND last_heartbeat_at < NOW() - INTERVAL '30 minutes'
    `);

    return Response.json({
      ok: true,
      closed: result.rowCount ?? 0,
    });
  } catch (error) {
    console.error('[SessionCleanup] Cron 执行失败:', error);
    return Response.json({ error: '会话清理失败' }, { status: 500 });
  }
}

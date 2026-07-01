// app/api/admin/settings/route.ts
// GET /api/admin/settings — 获取所有配置项
// PUT /api/admin/settings — 批量更新配置项 (UPSERT)

import { getAdminUserId } from '@/lib/admin/guard';
import { db, schema } from '@/lib/db';
import { eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/settings
 * 返回所有 analytics_settings 配置项（key-value 对象）
 */
export async function GET() {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  try {
    const rows = await db
      .select()
      .from(schema.analyticsSettings)
      .orderBy(schema.analyticsSettings.key);

    // 转换为 { key: value } 扁平对象
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('[AdminSettings] 获取配置失败:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings
 * 接收 { "heartbeat_interval": "15", ... }，批量 UPSERT 配置项
 */
export async function PUT(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  try {
    const body: Record<string, string> = await req.json();

    // 校验 body 必须是非空对象
    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
      return NextResponse.json({ error: '请求体不能为空' }, { status: 400 });
    }

    // 逐条 UPSERT
    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== 'string') {
        return NextResponse.json(
          { error: `配置项 "${key}" 的值必须是字符串` },
          { status: 400 },
        );
      }

      await db
        .insert(schema.analyticsSettings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: schema.analyticsSettings.key,
          set: { value, updatedAt: sql`now()` },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AdminSettings] 更新配置失败:', error);
    return NextResponse.json({ error: '更新配置失败' }, { status: 500 });
  }
}

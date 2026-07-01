// app/api/admin/behavior/activity/route.ts
// GET /api/admin/behavior/activity — 活跃度指标数据
// 返回: DAU, WAU, MAU, DAU/MAU 比值, 会话数趋势, 平均会话时长, 人均日会话数

import { getAdminUserId } from '@/lib/admin/guard';
import {
  queryDAU,
  queryWAU,
  queryMAU,
  querySessionCounts,
  queryAvgSessionDuration,
  queryAvgSessionsPerUser,
} from '@/lib/stats/behavior';
import type { DateRange } from '@/lib/stats/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // 管理员鉴权
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  // 日期范围参数，默认取最近 30 天
  const range: DateRange = {
    start: searchParams.get('start') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    end: searchParams.get('end') || new Date().toISOString().slice(0, 10),
  };

  try {
    const [
      dau,
      wau,
      mau,
      dailySessions,
      avgSessionDuration,
      avgSessionsPerUser,
    ] = await Promise.all([
      queryDAU({ start: range.end, end: range.end }),
      queryWAU(range),
      queryMAU(range),
      querySessionCounts(range),
      queryAvgSessionDuration(range),
      queryAvgSessionsPerUser(range),
    ]);

    // 直接从已获取的 dau/mau 计算比值，避免重复 DB 查询
    const dauMauRatio = mau > 0 ? (dau / mau) * 100 : 0;

    return NextResponse.json({
      dau,
      wau,
      mau,
      dauMauRatio: Math.round(dauMauRatio * 100) / 100,
      dailySessions,
      avgSessionDuration: Math.round(avgSessionDuration * 100) / 100,
      avgSessionsPerUser: Math.round(avgSessionsPerUser * 100) / 100,
    });
  } catch (error) {
    console.error('[BehaviorActivity] 获取活跃度数据失败:', error);
    return NextResponse.json({ error: '获取活跃度数据失败' }, { status: 500 });
  }
}

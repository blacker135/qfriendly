// app/api/admin/behavior/segments/route.ts
// GET /api/admin/behavior/segments — 用户分层指标数据
// 支持查询参数: start (YYYY-MM-DD), end (YYYY-MM-DD)，默认最近 30 天
// 返回: 活跃度分层, 各层占比趋势, 用户生命周期阶段分布

import { getAdminUserId } from '@/lib/admin/guard';
import {
  queryActivitySegments,
  querySegmentTrend,
  queryLifecycleDistribution,
} from '@/lib/stats/behavior';
import type { DateRange } from '@/lib/stats/behavior';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // 管理员鉴权
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  // 从查询参数提取日期范围，默认取最近 30 天
  const { searchParams } = new URL(req.url);
  const range: DateRange = {
    start: searchParams.get('start') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    end: searchParams.get('end') || new Date().toISOString().slice(0, 10),
  };

  try {
    const [
      segments,
      segmentTrend,
      lifecycleDistribution,
    ] = await Promise.all([
      queryActivitySegments(range),
      querySegmentTrend(range),
      queryLifecycleDistribution(range),
    ]);

    return NextResponse.json({
      segments,
      segmentTrend,
      lifecycleDistribution,
    });
  } catch (error) {
    console.error('[BehaviorSegments] 获取用户分层数据失败:', error);
    return NextResponse.json({ error: '获取用户分层数据失败' }, { status: 500 });
  }
}

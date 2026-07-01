// app/api/admin/behavior/segments/route.ts
// GET /api/admin/behavior/segments — 用户分层指标数据
// 返回: 活跃度分层, 各层占比趋势, 用户生命周期阶段分布

import { getAdminUserId } from '@/lib/admin/guard';
import {
  queryActivitySegments,
  querySegmentTrend,
  queryLifecycleDistribution,
} from '@/lib/stats/behavior';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // 管理员鉴权
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  try {
    const [
      segments,
      segmentTrend,
      lifecycleDistribution,
    ] = await Promise.all([
      queryActivitySegments(),
      querySegmentTrend(),
      queryLifecycleDistribution(),
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

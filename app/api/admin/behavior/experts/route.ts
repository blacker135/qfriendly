// app/api/admin/behavior/experts/route.ts
// GET /api/admin/behavior/experts — 专家使用指标数据
// 返回: 各专家使用占比, 各专家人均消息数, 专家切换频率, 专家偏好路径, 各专家用户覆盖率

import { getAdminUserId } from '@/lib/admin/guard';
import {
  queryExpertUsageShare,
  queryExpertAvgMessages,
  queryExpertSwitchFrequency,
  queryExpertSwitchPaths,
  queryExpertUserReach,
} from '@/lib/stats/behavior';
import type { DateRange } from '@/lib/stats/behavior';
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
      expertUsage,
      expertAvgMessages,
      switchFrequency,
      switchPaths,
      expertUserReach,
    ] = await Promise.all([
      queryExpertUsageShare(range),
      queryExpertAvgMessages(range),
      queryExpertSwitchFrequency(range),
      queryExpertSwitchPaths(range),
      queryExpertUserReach(range),
    ]);

    return NextResponse.json({
      expertUsage,
      expertAvgMessages,
      switchFrequency: Math.round(switchFrequency * 100) / 100,
      switchPaths,
      expertUserReach,
    });
  } catch (error) {
    console.error('[BehaviorExperts] 获取专家使用数据失败:', error);
    return NextResponse.json({ error: '获取专家使用数据失败' }, { status: 500 });
  }
}

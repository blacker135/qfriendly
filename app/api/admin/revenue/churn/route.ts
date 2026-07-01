// app/api/admin/revenue/churn/route.ts
// GET /api/admin/revenue/churn — 流失分析数据

import { getAdminUserId } from '@/lib/admin/guard';
import {
  queryChurnRate, queryRevenueChurnRate, queryChurnedUsers,
  queryNewPayingUsers, queryChurnRateByPlan, queryChurnByDuration,
  queryUpgradeDowngrade, queryUpgradeRate,
} from '@/lib/stats/revenue';
import type { DateRange } from '@/lib/stats/types';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const range: DateRange = {
    start: searchParams.get('start') || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    end: searchParams.get('end') || new Date().toISOString().slice(0, 10),
  };

  try {
    const [churnRate, revenueChurn, churned, newPaying,
      byPlan, byDuration, ud, upgradeRate] = await Promise.all([
      queryChurnRate(range), queryRevenueChurnRate(range),
      queryChurnedUsers(range), queryNewPayingUsers(range),
      queryChurnRateByPlan(range), queryChurnByDuration(),
      queryUpgradeDowngrade(range), queryUpgradeRate(range),
    ]);

    return NextResponse.json({
      churnRate, revenueChurnRate: revenueChurn,
      churnedUsers: churned, newPayingUsers: newPaying,
      churnByPlan: byPlan, churnByDuration: byDuration,
      upgrades: ud.upgrades, downgrades: ud.downgrades,
      upgradeRate,
    });
  } catch (error) {
    console.error('[RevenueChurn] 获取流失分析失败:', error);
    return NextResponse.json({ error: '获取流失分析失败' }, { status: 500 });
  }
}

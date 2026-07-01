// app/api/admin/revenue/overview/route.ts
// GET /api/admin/revenue/overview — 收入概览数据

import { getAdminUserId } from '@/lib/admin/guard';
import {
  queryMRR, queryARR, queryMRRWaterfall, queryMRRTrend,
  queryPlanMRRShare, queryPayingUsers, queryARPPU, queryLTV,
} from '@/lib/stats/revenue';
import type { DateRange } from '@/lib/stats/revenue';
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
    const [mrr, arr, waterfall, mrrTrend, planShare, payingUsers, arppu, ltv] =
      await Promise.all([
        queryMRR(), queryARR(), queryMRRWaterfall(range),
        queryMRRTrend(range), queryPlanMRRShare(range),
        queryPayingUsers(), queryARPPU(), queryLTV(),
      ]);

    return NextResponse.json({
      mrr, arr, waterfall, mrrTrend, planShare, payingUsers, arppu, ltv,
    });
  } catch (error) {
    console.error('[RevenueOverview] 获取收入概览失败:', error);
    return NextResponse.json({ error: '获取收入概览失败' }, { status: 500 });
  }
}

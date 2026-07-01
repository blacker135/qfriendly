// app/api/admin/revenue/funnel/route.ts
// GET /api/admin/revenue/funnel — 转化漏斗数据

import { getAdminUserId } from '@/lib/admin/guard';
import {
  queryVisitorToRegisterRate, queryRegisterToActiveRate,
  queryActiveToPaidRate, queryTrialToPaidAvgDays,
  queryNewSubPlanDistribution,
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
    const [v2r, r2a, a2p, avgDays, planDist] = await Promise.all([
      queryVisitorToRegisterRate(range), queryRegisterToActiveRate(range),
      queryActiveToPaidRate(range), queryTrialToPaidAvgDays(),
      queryNewSubPlanDistribution(range),
    ]);

    return NextResponse.json({
      funnel: {
        visitors: v2r.visitors, visitorToRegister: v2r.rate,
        registrations: v2r.registrations, registerToActive: r2a.rate,
        active: r2a.active, activeToPaid: a2p.rate,
        paid: a2p.paid,
        continuouslyPaid: a2p.paid, // 项目早期, 持续付费 ≈ 首次付费
      },
      trialToPaidDays: avgDays,
      planDistribution: planDist,
    });
  } catch (error) {
    console.error('[RevenueFunnel] 获取转化漏斗失败:', error);
    return NextResponse.json({ error: '获取转化漏斗失败' }, { status: 500 });
  }
}

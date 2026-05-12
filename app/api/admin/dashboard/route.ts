// app/api/admin/dashboard/route.ts
// GET /api/admin/dashboard — 返回仪表盘数据卡片

import { getAdminUserId } from '@/lib/admin/guard';
import {
  queryTotalUsers,
  queryActiveSubscriptions,
  queryTodayMessages,
  queryTotalRevenue,
} from '@/lib/stats';
import { NextResponse } from 'next/server';

export async function GET() {
  const auth = await getAdminUserId();
  if (auth instanceof NextResponse) return auth;

  try {
    const [totalUsers, activeSubs, todayMessages, totalRevenue] = await Promise.all([
      queryTotalUsers(),
      queryActiveSubscriptions(),
      queryTodayMessages(),
      queryTotalRevenue(),
    ]);

    return NextResponse.json({
      totalUsers,
      activeSubscriptions: activeSubs,
      todayMessages,
      totalRevenue,
    });
  } catch (error) {
    console.error('[AdminDashboard] 获取概览失败:', error);
    return NextResponse.json({ error: '获取概览失败' }, { status: 500 });
  }
}

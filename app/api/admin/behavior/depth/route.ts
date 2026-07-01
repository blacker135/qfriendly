// app/api/admin/behavior/depth/route.ts
// GET /api/admin/behavior/depth — 对话深度指标数据
// 返回: 日均消息数趋势, 人均会话消息数, 对话完成率, 平均轮次

import { getAdminUserId } from '@/lib/admin/guard';
import {
  queryDailyMessages,
  queryAvgMessagesPerConversation,
  queryConversationCompletionRate,
  queryAvgTurns,
  queryAvgDailyMessageCount,
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
      dailyMessages,
      avgMessagesPerConversation,
      completionRate,
      avgTurns,
      avgDailyMessageCount,
    ] = await Promise.all([
      queryDailyMessages(range),
      queryAvgMessagesPerConversation(range),
      queryConversationCompletionRate(range),
      queryAvgTurns(range),
      queryAvgDailyMessageCount(range),
    ]);

    return NextResponse.json({
      dailyMessages,
      avgMessagesPerConversation: Math.round(avgMessagesPerConversation * 100) / 100,
      completionRate: Math.round(completionRate * 100) / 100,
      avgTurns: Math.round(avgTurns * 100) / 100,
      avgDailyMessageCount: Math.round(avgDailyMessageCount * 100) / 100,
    });
  } catch (error) {
    console.error('[BehaviorDepth] 获取对话深度数据失败:', error);
    return NextResponse.json({ error: '获取对话深度数据失败' }, { status: 500 });
  }
}

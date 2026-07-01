'use client';
// components/admin/revenue/FunnelBar.tsx
// 转化漏斗横条图 — 使用纯 CSS 渐宽横条展示各层级转化率和绝对数量
// 每一层级显示: 标签 / 横条(宽度按比例) + 数值 / 百分比 / 到下一层的转化率

/** 漏斗中每一层阶段（导出供 Tab 组件复用） */
export interface FunnelStage {
  label: string;      // 阶段名称（如"访客"、"注册"、"活跃"、"付费"）
  count: number;      // 该层级的绝对数量
  rate?: number;      // 该层到下一层的转化率（百分比），最后一层无
}

interface FunnelBarProps {
  stages: FunnelStage[];
}

export default function FunnelBar({ stages }: FunnelBarProps) {
  // 以最大层级数量为 100% 计算各层宽度比例
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  // 根据转化率返回颜色类名
  const getRateColor = (rate: number) => {
    if (rate >= 20) return 'text-green-400';
    if (rate >= 5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-[#2D2D44] rounded-xl border border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4">全站转化漏斗</h3>
      <div className="space-y-3">
        {stages.map((stage, i) => {
          // 计算宽度百分比（相对最大层级）
          const widthPercent = (stage.count / maxCount) * 100;
          return (
            <div key={stage.label} className="flex items-center gap-3">
              {/* 阶段标签 — 右对齐 */}
              <span className="text-xs text-gray-400 w-20 text-right shrink-0">
                {stage.label}
              </span>
              {/* 横条 — 渐宽表示数量递减 */}
              <div className="flex-1 flex items-center gap-2">
                <div
                  className="h-7 rounded bg-blue-500/70 flex items-center justify-end px-2 min-w-[40px] transition-all duration-500"
                  style={{ width: `${Math.max(widthPercent, 2)}%` }}
                >
                  <span className="text-xs text-white font-medium">
                    {stage.count.toLocaleString()}
                  </span>
                </div>
                {/* 相对最大层的比例 */}
                <span className="text-xs text-gray-500 w-12 shrink-0">
                  {widthPercent.toFixed(1)}%
                </span>
              </div>
              {/* 转化率箭头 — 仅非最后一层显示 */}
              {i < stages.length - 1 && stage.rate !== undefined && (
                <span className="text-xs w-16 shrink-0 text-center">
                  <span className="text-gray-500">↓ </span>
                  <span className={getRateColor(stage.rate)}>
                    {stage.rate.toFixed(1)}%
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

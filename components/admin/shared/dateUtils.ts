// components/admin/shared/dateUtils.ts
// 管理后台日期工具函数

export type Preset = 'day' | 'month' | 'year' | 'custom';

export function getDefaultDateRange(): { start: string; end: string; preset: Preset } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return {
    start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
    end: fmt(today),
    preset: 'month',
  };
}

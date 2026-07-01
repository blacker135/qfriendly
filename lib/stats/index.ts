// lib/stats/index.ts
// 数据统计引擎 — 统一导出

export * from './schema';
export * from './collector';
export * from './processor';
export * from './query';
// DateRange 在 query.ts 和 revenue.ts 中均有定义（接口完全相同），
// 显式从 query.ts 重导出以消除 barrel 歧义
export type { DateRange } from './query';
export * from './revenue';
export * from './behavior';

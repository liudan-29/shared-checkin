// 周维度日期工具。周从周一开始算（工作日模板对应周一到周五连续、周末模板对应周六周日连续，
// 从周一起算能让"本周"这个聚合和模板的工作日/周末划分更自然对齐）

import { addDays, parseDateString, formatDateString } from "./preview-plan";

// 归属周的周一日期字符串
export function getWeekStart(dateStr: string): string {
  const d = parseDateString(dateStr);
  const day = d.getDay(); // 0=周日 1=周一...6=周六
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  return formatDateString(d);
}

export function getWeekEnd(weekStart: string): string {
  return addDays(weekStart, 6);
}

// 周一到周日，长度7
export function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) dates.push(addDays(weekStart, i));
  return dates;
}

export function addWeeks(weekStart: string, delta: number): string {
  return addDays(weekStart, delta * 7);
}

export type WeekMode = "current" | "past" | "future";

export function getWeekMode(weekStart: string, today: string): WeekMode {
  const weekEnd = getWeekEnd(weekStart);
  if (today >= weekStart && today <= weekEnd) return "current";
  return today > weekEnd ? "past" : "future";
}

// "7月14日–7月20日"，跨年份或不在当前年份时前缀年份，比如"2025年12月29日–2026年1月4日"
export function formatWeekRangeLabel(weekStart: string, todayYearStr: string): string {
  const start = parseDateString(weekStart);
  const end = parseDateString(getWeekEnd(weekStart));
  const todayYear = parseDateString(todayYearStr).getFullYear();
  const crossesYear = start.getFullYear() !== end.getFullYear();
  const startLabel =
    crossesYear || start.getFullYear() !== todayYear
      ? `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日`
      : `${start.getMonth() + 1}月${start.getDate()}日`;
  const endLabel =
    crossesYear || end.getFullYear() !== todayYear
      ? `${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`
      : `${end.getMonth() + 1}月${end.getDate()}日`;
  return `${startLabel}–${endLabel}`;
}

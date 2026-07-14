// 未来日期的预览：从模板生成"当天会长什么样"的slots，不写入数据库，纯前端展示
// 与 ensureDayPlan 的差异：ensureDayPlan 会真正建行入库，只用于"今天"；preview 用于未来日期，纯只读

import type { DayType, PlanSlot, Slot } from "./types";

export function slotsToPreviewPlanSlots(templateSlots: Slot[]): PlanSlot[] {
  return templateSlots.map((s) => ({
    ...s,
    done: false,
    checked_at: null,
    note: null,
    photo_url: null,
  }));
}

// 按日期算 dayType（工作日/周末），本地时区
export function dayTypeOf(date: Date): DayType {
  const day = date.getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

// 日期字符串 YYYY-MM-DD 转 Date（本地零点）；避免直接 new Date("2026-07-14") 走 UTC 造成时区偏差
export function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Date 转 YYYY-MM-DD 字符串，本地时区
export function formatDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 判断日期字符串对应的"相对今天"的位置
export type DateMode = "past" | "today" | "future";

export function getDateMode(dateStr: string, today: string): DateMode {
  if (dateStr === today) return "today";
  return dateStr < today ? "past" : "future";
}

// 日期偏移工具
export function addDays(dateStr: string, delta: number): string {
  const d = parseDateString(dateStr);
  d.setDate(d.getDate() + delta);
  return formatDateString(d);
}

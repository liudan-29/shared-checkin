import type { PlanSlot } from "./types";

export type SlotStatus = "not-started" | "in-progress" | "overdue" | "done";

// HH:mm 转当天分钟数
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutes(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

// 拖延从 end_time 起算：进行中不算拖延，过了结束时间还没打卡才算
export function getSlotStatus(slot: PlanSlot, now: Date): SlotStatus {
  if (slot.done) return "done";
  const nowM = nowMinutes(now);
  const startM = toMinutes(slot.start_time);
  const endM = toMinutes(slot.end_time);
  if (nowM < startM) return "not-started";
  if (nowM < endM) return "in-progress";
  return "overdue";
}

// 拖延分钟数，仅在 overdue 状态下有意义
export function getOverdueMinutes(slot: PlanSlot, now: Date): number {
  const nowM = nowMinutes(now);
  const endM = toMinutes(slot.end_time);
  return Math.max(0, nowM - endM);
}

export function formatOverdue(minutes: number): string {
  if (minutes < 60) return `拖延${minutes}分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `拖延${h}小时` : `拖延${h}小时${m}分`;
}

export function getTodayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

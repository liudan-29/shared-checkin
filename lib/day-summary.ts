// 某天的统计数据计算。纯函数，输入DayPlan.slots和"参考时间"，输出可直接渲染的结构
// 参考时间的作用：过去/今天/未来的语义不同——
//   过去：所有未打卡的时段一律算拖延（因为那天已过完）
//   今天：只有已经过了end_time还没打卡的算拖延（沿用slot-status的口径）
//   未来：不算拖延也不算完成（模板预览，还没发生）

import type { PlanSlot } from "./types";
import { getSlotStatus, getOverdueMinutes } from "./slot-status";

export type DaySummary = {
  totalSlots: number;
  doneSlots: number;
  overdueSlots: number;
  totalOverdueMinutes: number;
  completionRate: number; // 0-1
  notes: { time: string; task: string; note: string }[]; // 按start_time升序
};

// mode: "past" 已过完的日子，所有未done算拖延；"current" 今天，走slot-status口径；"future" 预览，全部按未开始算
export function computeDaySummary(
  slots: PlanSlot[],
  now: Date,
  mode: "past" | "current" | "future"
): DaySummary {
  const total = slots.length;
  const done = slots.filter((s) => s.done).length;

  let overdueCount = 0;
  let overdueMinutes = 0;

  if (mode === "past") {
    for (const s of slots) {
      if (!s.done) {
        overdueCount++;
        overdueMinutes += minutesInSlot(s);
      }
    }
  } else if (mode === "current") {
    for (const s of slots) {
      const status = getSlotStatus(s, now);
      if (status === "overdue") {
        overdueCount++;
        overdueMinutes += getOverdueMinutes(s, now);
      }
    }
  }
  // future模式：不算拖延

  const notes = slots
    .filter((s) => s.done && s.note && s.note.trim().length > 0)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map((s) => ({
      time: s.start_time,
      task: s.task,
      note: s.note!.trim(),
    }));

  return {
    totalSlots: total,
    doneSlots: done,
    overdueSlots: overdueCount,
    totalOverdueMinutes: overdueMinutes,
    completionRate: total === 0 ? 0 : done / total,
    notes,
  };
}

// 一个时段占多少分钟，用于past模式下未打卡的拖延时长（按整个时段的时长算，因为整段都错过了）
function minutesInSlot(slot: PlanSlot): number {
  const [sh, sm] = slot.start_time.split(":").map(Number);
  const [eh, em] = slot.end_time.split(":").map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export function formatDurationHM(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}小时` : `${h}小时${m}分`;
}

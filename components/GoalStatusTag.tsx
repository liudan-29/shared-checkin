"use client";

import { CircleCheck, Minus, Clock } from "lucide-react";
import type { GoalStatus } from "@/lib/week-summary";

export type { GoalStatus };

// 目标达成三态：达成=平静的正向确认(accent)，未达标=历史陈述(中性灰，同HistoryTag)，
// 进行中=虚线待定(同AddSlotRow/MissedMark的"尚未落定"语言)。
// 三态都不借用CompletionStamp的仪式感或DelayTag的红色警报——回顾性的周结果不需要那种强度
export function GoalStatusTag({ status }: { status: GoalStatus }) {
  if (status === "achieved") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-sm"
        style={{ backgroundColor: "var(--color-accent-subtle)", color: "var(--color-accent)" }}
      >
        <CircleCheck className="h-3 w-3 shrink-0" />
        达成
      </span>
    );
  }
  if (status === "missed") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-sm"
        style={{ backgroundColor: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)" }}
      >
        <Minus className="h-3 w-3 shrink-0" />
        未达标
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-sm text-muted-foreground"
      style={{ border: "1px dashed var(--color-border-default)" }}
    >
      <Clock className="h-3 w-3 shrink-0" />
      进行中
    </span>
  );
}

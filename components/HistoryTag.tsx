"use client";

import { Minus, Clock } from "lucide-react";

// 历史标记：过去日期的"未完成"/"晚N分钟完成"。中性灰、不倾斜、无动画，
// 刻意区别于 DelayTag（进行时的红色警报），表达"已成历史、纯记录"
export function HistoryTag({ kind, text }: { kind: "missed" | "late"; text: string }) {
  const Icon = kind === "missed" ? Minus : Clock;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-sm"
      style={{
        backgroundColor: "var(--color-bg-tertiary)",
        color: "var(--color-text-secondary)",
      }}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {text}
    </span>
  );
}

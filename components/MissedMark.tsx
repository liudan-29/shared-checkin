"use client";

import { Minus } from "lucide-react";

// 过去日期未完成时段的右侧标记：虚线圈+减号，静态无交互。
// 虚线区别于 CheckButton 的实线描边，一眼看出"不是按钮"
export function MissedMark() {
  return (
    <div
      role="img"
      aria-label="这个时段没有完成"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
      style={{ border: "1.5px dashed var(--color-border-default)" }}
    >
      <Minus className="h-[18px] w-[18px] text-muted-foreground" />
    </div>
  );
}

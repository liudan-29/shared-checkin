"use client";

import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CycleGoal } from "@/lib/types";
import { GoalStatusTag, type GoalStatus } from "./GoalStatusTag";

export function describeGoal(goal: CycleGoal): string {
  return goal.kind === "overall_rate"
    ? `本周完成率≥${goal.target_rate}%`
    : `${goal.task_label}一次不落`;
}

export function GoalRow({
  goal,
  status,
  progressText,
  variant,
  onClick,
}: {
  goal: CycleGoal;
  status: GoalStatus;
  progressText?: string;
  variant: "editable" | "readonly";
  onClick?: () => void;
}) {
  const clickable = variant === "editable";
  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={cn(
        "flex min-h-[56px] flex-col justify-center rounded-md bg-card px-4 py-3 shadow-sm transition-colors duration-fast",
        clickable && "cursor-pointer hover:bg-popover active:bg-secondary"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="truncate font-display text-lg text-foreground">{describeGoal(goal)}</span>
        <div className="flex shrink-0 items-center gap-2">
          <GoalStatusTag status={status} />
          {clickable && <Pencil className="h-[18px] w-[18px] text-muted-foreground" aria-hidden />}
        </div>
      </div>
      {progressText && (
        <p className="mt-1 font-mono text-sm text-muted-foreground">{progressText}</p>
      )}
    </div>
  );
}

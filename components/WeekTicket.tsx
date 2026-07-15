"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Eye } from "lucide-react";
import { PunchStrip } from "./PunchStrip";
import type { SlotStatus } from "@/lib/slot-status";
import type { WeekMode } from "@/lib/week";

export function WeekTicket({
  weekRangeLabel,
  mode,
  weekDayOutcomes,
  doneCount,
  totalCount,
  onBack,
  onPrev,
  onNext,
  onJumpCurrentWeek,
  prevDisabled,
  nextDisabled,
}: {
  weekRangeLabel: string;
  mode: WeekMode;
  weekDayOutcomes: SlotStatus[];
  doneCount: number;
  totalCount: number;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
  onJumpCurrentWeek: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}) {
  return (
    <div className="rounded-lg bg-card p-4 shadow-md">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="返回"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary active:scale-[0.92]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="truncate font-display text-2xl text-foreground">{weekRangeLabel}</span>
      </div>

      <div className="mt-2 flex h-11 items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={prevDisabled}
          aria-label="上一周"
          className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary active:scale-[0.92] disabled:pointer-events-none disabled:opacity-35"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          {mode !== "current" && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm text-muted-foreground"
              style={{ backgroundColor: "var(--color-bg-tertiary)" }}
            >
              {mode === "past" ? (
                <>
                  <Clock className="h-3 w-3" />
                  已结束
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  预览
                </>
              )}
            </span>
          )}
          {mode !== "current" && (
            <button
              type="button"
              onClick={onJumpCurrentWeek}
              className="text-sm text-ink transition-colors hover:text-ink-hover active:scale-[0.96]"
            >
              回到本周
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          aria-label="下一周"
          className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary active:scale-[0.92] disabled:pointer-events-none disabled:opacity-35"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="my-3" style={{ borderTop: "1px dashed var(--color-border-default)" }} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">本周</span>
          <PunchStrip statuses={weekDayOutcomes} />
        </div>
        <span className="font-mono text-base font-semibold text-foreground">
          {doneCount}/{totalCount}
        </span>
      </div>
    </div>
  );
}

"use client";

import { NotebookPen, LogOut, BarChart3, ChevronLeft, ChevronRight, Lock, Eye, CalendarDays } from "lucide-react";
import { PunchStrip } from "./PunchStrip";
import type { SlotStatus } from "@/lib/slot-status";
import type { DateMode } from "@/lib/preview-plan";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function DateTicket({
  date,
  mode,
  viewedDayType,
  myStatuses,
  doneCount,
  totalCount,
  onPrev,
  onNext,
  onJumpToday,
  onOpenTemplate,
  onOpenSummary,
  onOpenDateJump,
  onLogout,
  prevDisabled,
  nextDisabled,
}: {
  date: Date;
  mode: DateMode;
  viewedDayType: "weekday" | "weekend";
  myStatuses: SlotStatus[];
  doneCount: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
  onJumpToday: () => void;
  onOpenTemplate: () => void;
  onOpenSummary: () => void;
  onOpenDateJump: () => void;
  onLogout: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
}) {
  return (
    <div className="rounded-lg bg-card p-4 shadow-md">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onOpenDateJump}
          aria-label="选择日期"
          className="-my-1 -ml-1 flex items-baseline gap-1 rounded-md py-1 pl-1 pr-2 transition-transform duration-fast ease-default hover:bg-secondary active:scale-[0.98]"
        >
          <span className="font-display text-2xl text-foreground">
            {date.getMonth() + 1}月{date.getDate()}日
          </span>
          <span className="text-lg text-muted-foreground">
            {WEEKDAY_NAMES[date.getDay()]}
          </span>
          <CalendarDays className="h-3.5 w-3.5 self-center text-muted-foreground" aria-hidden />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenSummary}
            aria-label="查看总结"
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary active:scale-[0.92]"
          >
            <BarChart3 className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onOpenTemplate}
            aria-label="模板"
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary active:scale-[0.92]"
          >
            <NotebookPen className="h-5 w-5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="账号菜单"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-subtle text-ink"
              >
                我
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 导航行 */}
      <div className="mt-2 flex h-11 items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={prevDisabled}
          aria-label="前一天"
          className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary active:scale-[0.92] disabled:pointer-events-none disabled:opacity-35"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          {mode !== "today" && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm text-muted-foreground"
              style={{ backgroundColor: "var(--color-bg-tertiary)" }}
            >
              {mode === "past" ? (
                <>
                  <Lock className="h-3 w-3" />
                  只读
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  预览·{viewedDayType === "weekend" ? "周末" : "工作日"}模板
                </>
              )}
            </span>
          )}
          {mode !== "today" && (
            <button
              type="button"
              onClick={onJumpToday}
              className="text-sm text-ink transition-colors hover:text-ink-hover active:scale-[0.96]"
            >
              回到今天
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          aria-label="后一天"
          className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary active:scale-[0.92] disabled:pointer-events-none disabled:opacity-35"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="my-3" style={{ borderTop: "1px dashed var(--color-border-default)" }} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">进度</span>
          <PunchStrip statuses={myStatuses} />
        </div>
        <span className="font-mono text-base font-semibold text-foreground">
          {doneCount}/{totalCount}
        </span>
      </div>
    </div>
  );
}

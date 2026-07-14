"use client";

import { NotebookPen, LogOut } from "lucide-react";
import { PunchStrip } from "./PunchStrip";
import type { SlotStatus } from "@/lib/slot-status";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function DateTicket({
  date,
  myStatuses,
  doneCount,
  totalCount,
  onOpenTemplate,
  onLogout,
}: {
  date: Date;
  myStatuses: SlotStatus[];
  doneCount: number;
  totalCount: number;
  onOpenTemplate: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="rounded-lg bg-card p-4 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl text-foreground">
            {date.getMonth() + 1}月{date.getDate()}日
          </span>
          <span className="text-lg text-secondary-foreground text-muted-foreground">
            {WEEKDAY_NAMES[date.getDay()]}
          </span>
        </div>
        <div className="flex items-center gap-1">
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

      <div
        className="my-3"
        style={{ borderTop: "1px dashed var(--color-border-default)" }}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">今日</span>
          <PunchStrip statuses={myStatuses} />
        </div>
        <span className="font-mono text-base font-semibold text-foreground">
          {doneCount}/{totalCount}
        </span>
      </div>
    </div>
  );
}

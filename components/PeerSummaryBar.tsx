"use client";

import { ChevronRight, Clock, Check } from "lucide-react";
import { PunchStrip } from "./PunchStrip";
import type { SlotStatus } from "@/lib/slot-status";

export function PeerSummaryBar({
  name,
  statuses,
  overdueText,
  inProgressTask,
  onClick,
}: {
  name: string;
  statuses: SlotStatus[];
  overdueText: string | null;
  inProgressTask: string | null;
  onClick: () => void;
}) {
  let statusNode;
  if (overdueText) {
    statusNode = (
      <span className="flex items-center gap-1 text-sm text-danger">
        <Clock className="h-3.5 w-3.5" />
        <span className="font-mono">{overdueText}</span>
      </span>
    );
  } else if (inProgressTask) {
    statusNode = (
      <span className="truncate text-sm text-muted-foreground">
        正在做·{inProgressTask}
      </span>
    );
  } else if (statuses.length > 0 && statuses.every((s) => s === "done")) {
    statusNode = (
      <span className="flex items-center gap-1 text-sm text-ink">
        <Check className="h-3.5 w-3.5" />
        今日全勤
      </span>
    );
  } else if (statuses.length === 0) {
    statusNode = <span className="text-sm text-muted-foreground">还没安排</span>;
  } else {
    statusNode = <span className="text-sm text-muted-foreground">今日待办</span>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full items-center gap-3 rounded-md bg-card px-4 py-3 shadow-sm transition-colors duration-fast hover:bg-popover active:bg-secondary"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-subtle text-sm font-display text-ink">
        {name.slice(0, 1)}
      </span>
      <span className="shrink-0 font-display text-base text-foreground">{name}</span>
      <PunchStrip statuses={statuses} size={10} />
      <span className="ml-auto min-w-0 flex-1 truncate text-right">{statusNode}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

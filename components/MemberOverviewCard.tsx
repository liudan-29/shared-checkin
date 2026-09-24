"use client";

import { Check, Clock } from "lucide-react";
import { PunchStrip } from "./PunchStrip";
import type { SlotStatus } from "@/lib/slot-status";

export function MemberOverviewCard({
  name,
  isMine,
  statuses,
  doneCount,
  totalCount,
  overdueText,
  inProgressTask,
}: {
  name: string;
  isMine: boolean;
  statuses: SlotStatus[];
  doneCount: number;
  totalCount: number;
  overdueText: string | null;
  inProgressTask: string | null;
}) {
  return (
    <section className="flex min-h-[156px] min-w-0 flex-col rounded-lg bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-subtle font-display text-sm text-ink">
          {isMine ? "我" : name.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1 truncate font-display text-lg text-foreground" title={name}>
          {isMine ? `我·${name}` : name}
        </span>
        <span className="shrink-0 font-mono text-xl text-foreground">
          {doneCount}/{totalCount}
        </span>
      </div>

      <div className="my-4" style={{ borderTop: "1px dashed var(--color-border-default)" }} />

      <div className="min-h-5">
        <PunchStrip statuses={statuses} size={10} />
      </div>

      <div className="mt-auto pt-3">
        {overdueText ? (
          <span className="flex items-center gap-1.5 text-sm text-danger">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono">{overdueText}</span>
          </span>
        ) : inProgressTask ? (
          <p className="truncate text-sm text-ink" title={inProgressTask}>
            正在做·{inProgressTask}
          </p>
        ) : statuses.length > 0 && statuses.every((status) => status === "done") ? (
          <span className="flex items-center gap-1.5 text-sm text-ink">
            <Check className="h-3.5 w-3.5" />今日全勤
          </span>
        ) : (
          <p className="text-sm text-muted-foreground">
            {statuses.length ? "还有任务待完成" : "这天还没安排"}
          </p>
        )}
      </div>
    </section>
  );
}

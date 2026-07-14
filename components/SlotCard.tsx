"use client";

import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanSlot } from "@/lib/types";
import type { SlotStatus } from "@/lib/slot-status";
import { StatusPill } from "./StatusPill";
import { DelayTag } from "./DelayTag";
import { CheckButton } from "./CheckButton";
import { CompletionStamp } from "./CompletionStamp";

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function SlotCard({
  slot,
  variant,
  status,
  overdueText,
  onCheck,
  onUncheck,
  onEdit,
  checking,
}: {
  slot: PlanSlot;
  variant: "mine" | "peer";
  status: SlotStatus;
  overdueText: string | null;
  onCheck?: () => void;
  onUncheck?: () => void;
  onEdit?: () => void;
  checking?: boolean;
}) {
  const isOverdue = status === "overdue";
  const isInProgress = status === "in-progress";
  const isDone = status === "done";

  return (
    <div
      onClick={variant === "mine" ? onEdit : undefined}
      className={cn(
        "relative flex min-h-[80px] items-center gap-3 rounded-lg bg-card p-4 shadow-sm transition-colors duration-fast",
        variant === "mine" && "cursor-pointer active:bg-popover"
      )}
      style={{
        border: isInProgress ? "1.5px solid var(--color-accent)" : undefined,
        backgroundColor: isInProgress ? "var(--color-accent-subtle)" : undefined,
        borderLeft: isOverdue ? "3px solid var(--color-danger)" : undefined,
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="font-mono text-lg font-semibold"
            style={{ color: isInProgress ? "var(--color-accent)" : "var(--color-text-primary)" }}
          >
            {slot.start_time}–{slot.end_time}
          </span>
          {isInProgress && <StatusPill />}
          {isOverdue && overdueText && <DelayTag minutesText={overdueText} />}
        </div>
        <p
          className="mt-1 flex items-center gap-2 font-display text-lg"
          style={{
            color: isDone ? "var(--color-text-secondary)" : "var(--color-text-primary)",
          }}
        >
          <span className="truncate">{slot.task}</span>
          {variant === "mine" && (
            <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          )}
        </p>
        {isDone && slot.checked_at && (
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            {formatTime(slot.checked_at)}打卡
          </p>
        )}
        {isDone && slot.note && (
          <p className="mt-1 truncate text-sm text-secondary-foreground text-muted-foreground">
            {slot.note}
          </p>
        )}
      </div>

      <div
        className="flex w-14 shrink-0 items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {variant === "mine" ? (
          isDone ? (
            <CompletionStamp checkedAt={slot.checked_at} clickable onUncheck={onUncheck} />
          ) : (
            <CheckButton onClick={() => onCheck?.()} disabled={checking} active={isInProgress} />
          )
        ) : (
          isDone && <CompletionStamp checkedAt={slot.checked_at} />
        )}
      </div>
    </div>
  );
}

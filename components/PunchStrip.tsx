import { cn } from "@/lib/utils";
import type { PlanSlot } from "@/lib/types";
import type { SlotStatus } from "@/lib/slot-status";

export function PunchStrip({
  statuses,
  size = 12,
}: {
  statuses: SlotStatus[];
  size?: number;
}) {
  const dotSize = statuses.length > 12 ? Math.min(size, 8) : size;

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status, i) => (
        <span
          key={i}
          className={cn(
            "rounded-sm",
            status === "in-progress" && "animate-pulse-ring"
          )}
          style={{
            width: dotSize,
            height: dotSize,
            backgroundColor:
              status === "done"
                ? "var(--color-accent)"
                : status === "overdue" || status === "missed"
                ? "var(--color-danger)"
                : "transparent",
            border:
              status === "not-started"
                ? "1.5px solid var(--color-border-default)"
                : status === "in-progress"
                ? "1.5px solid var(--color-accent)"
                : "none",
          }}
        />
      ))}
    </div>
  );
}

export function slotsToStatuses(
  slots: PlanSlot[],
  getStatus: (s: PlanSlot) => SlotStatus
): SlotStatus[] {
  return slots.map(getStatus);
}

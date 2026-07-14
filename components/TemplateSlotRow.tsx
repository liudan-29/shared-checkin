"use client";

import { Pencil } from "lucide-react";
import type { Slot } from "@/lib/types";

export function TemplateSlotRow({ slot, onClick }: { slot: Slot; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full items-center gap-4 rounded-md bg-card px-4 py-3 shadow-sm transition-colors duration-fast hover:bg-popover active:bg-secondary"
    >
      <span className="w-[110px] shrink-0 text-left font-mono text-base font-semibold text-foreground">
        {slot.start_time}–{slot.end_time}
      </span>
      <span className="min-w-0 flex-1 truncate text-left font-display text-lg text-foreground">
        {slot.task}
      </span>
      <Pencil className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
    </button>
  );
}

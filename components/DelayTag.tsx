"use client";

import { Clock } from "lucide-react";

export function DelayTag({ minutesText }: { minutesText: string }) {
  return (
    <span
      className="inline-flex -rotate-2 items-center gap-1 rounded-sm px-2 py-0.5 text-sm"
      style={{
        backgroundColor: "var(--color-danger-subtle)",
        color: "var(--color-danger)",
        border: "1px dashed rgba(186,61,35,0.45)",
      }}
    >
      <Clock className="h-3 w-3 shrink-0" />
      <span key={minutesText} className="font-mono font-semibold animate-fade-in-up">
        {minutesText}
      </span>
    </span>
  );
}

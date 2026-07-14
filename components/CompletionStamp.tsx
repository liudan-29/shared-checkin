"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function CompletionStamp({
  checkedAt,
  clickable,
  onUncheck,
}: {
  checkedAt: string | null;
  clickable?: boolean;
  onUncheck?: () => void;
}) {
  const [open, setOpen] = useState(false);

  const stamp = (
    <div
      className="relative flex h-16 w-16 shrink-0 -rotate-[8deg] flex-col items-center justify-center rounded-full text-center opacity-90 animate-stamp-in"
      style={{
        border: "2px solid var(--color-accent)",
        color: "var(--color-accent)",
      }}
    >
      <div
        className="absolute rounded-full"
        style={{ inset: 4, border: "1px solid var(--color-accent)" }}
      />
      <Check className="h-3.5 w-3.5" />
      <span className="text-[11px] font-display leading-tight">已完成</span>
      <span className="font-mono text-[10px] leading-tight">{formatTime(checkedAt)}</span>
    </div>
  );

  if (!clickable) return stamp;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)} aria-label="取消打卡">
        {stamp}
      </button>
      <DialogContent className="max-w-xs">
        <p className="pr-6 text-lg text-foreground">取消这次打卡？</p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
            留着
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setOpen(false);
              onUncheck?.();
            }}
          >
            取消打卡
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

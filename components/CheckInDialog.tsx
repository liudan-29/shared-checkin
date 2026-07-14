"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function CheckInDialog({
  open,
  onOpenChange,
  taskName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskName?: string;
  onConfirm: (note: string | null) => void;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <p className="pr-6 font-display text-lg text-foreground">
          {taskName ? `${taskName}做完了` : "打卡"}
        </p>
        <div className="relative mt-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 40))}
            placeholder="做了什么（选填）"
            rows={2}
            className="w-full resize-none rounded-md border-0 bg-secondary px-3 py-2 text-lg font-body text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-sm text-muted-foreground">
            {note.length}/40
          </span>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onConfirm(null);
            }}
          >
            跳过
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onOpenChange(false);
              onConfirm(note.trim() || null);
            }}
          >
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

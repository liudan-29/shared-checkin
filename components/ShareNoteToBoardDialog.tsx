"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ShareNoteToBoardDialog({
  open,
  onOpenChange,
  note,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: string;
  submitting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <p className="pr-6 font-display text-lg text-foreground">要把这条记录发到留言板吗？</p>
        <div className="mt-3 rounded-md bg-secondary px-3 py-2 text-lg font-body text-foreground">
          {note}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            不用了
          </Button>
          <Button size="sm" loading={submitting} loadingText="发布中…" onClick={onConfirm}>
            发布
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

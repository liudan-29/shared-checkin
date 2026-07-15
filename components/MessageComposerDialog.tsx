"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const MAX_LEN = 40;

export function MessageComposerDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (content: string) => void;
}) {
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open) setContent("");
  }, [open]);

  const trimmed = content.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <p className="pr-6 font-display text-lg text-foreground">写一句话</p>
        <div className="relative mt-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_LEN))}
            placeholder="写句鼓励或加油的话"
            rows={3}
            className="pb-6"
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-sm text-muted-foreground">
            {content.length}/{MAX_LEN}
          </span>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            size="sm"
            disabled={!trimmed}
            loading={submitting}
            loadingText="发布中…"
            onClick={() => onSubmit(trimmed)}
          >
            发布
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

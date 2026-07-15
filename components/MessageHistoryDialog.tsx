"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { MessageView } from "./MessageBoard";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export function MessageHistoryDialog({
  open,
  onOpenChange,
  messages,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: MessageView[];
  onDelete: (id: string) => void;
}) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <p className="pr-6 font-display text-lg text-foreground">留言板</p>
          <div className="mt-3 max-h-[60vh] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-base text-muted-foreground">还没有人留言</p>
            ) : (
              <div className="flex flex-col gap-1">
                {messages.map((m, i) => (
                  <div
                    key={m.id}
                    className="flex items-start gap-2 py-3"
                    style={
                      i < messages.length - 1
                        ? { borderBottom: "1px solid var(--color-border-subtle)" }
                        : undefined
                    }
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-subtle text-xs font-display text-ink">
                      {m.authorLabel.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-display text-base text-foreground">{m.content}</p>
                      <p className="mt-1 font-mono text-sm text-muted-foreground">
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                    {m.isMine && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="删除这条留言"
                        className="shrink-0 text-muted-foreground hover:text-danger"
                        onClick={() => setPendingDeleteId(m.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(o) => !o && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>删除后这条留言就找不回来了。</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>再想想</AlertDialogCancel>
            <AlertDialogAction
              className="bg-danger hover:bg-danger-hover"
              onClick={() => {
                if (pendingDeleteId) onDelete(pendingDeleteId);
                setPendingDeleteId(null);
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

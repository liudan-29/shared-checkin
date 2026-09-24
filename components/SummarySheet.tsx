"use client";

import { X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { SummaryCompareTable, type SummaryMember } from "./SummaryCompareTable";
import { SummaryNotesList, type NoteEntry } from "./SummaryNotesList";

export function SummarySheet({
  open,
  onOpenChange,
  dateLabel,
  members,
  notes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateLabel: string;
  members: SummaryMember[];
  notes: NoteEntry[];
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="flex items-center justify-between">
          <DrawerTitle>{dateLabel}总结</DrawerTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="关闭"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">完成情况</span>
            <SummaryCompareTable members={members} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">备注</span>
            <SummaryNotesList entries={notes} />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

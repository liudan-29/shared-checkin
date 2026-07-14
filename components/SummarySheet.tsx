"use client";

import { X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { SummaryCompareTable } from "./SummaryCompareTable";
import { SummaryNotesList, type NoteEntry } from "./SummaryNotesList";
import type { DaySummary } from "@/lib/day-summary";

export function SummarySheet({
  open,
  onOpenChange,
  dateLabel,
  peerName,
  mine,
  peer,
  mineExists,
  peerExists,
  notes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateLabel: string;
  peerName: string;
  mine: DaySummary;
  peer: DaySummary;
  mineExists: boolean;
  peerExists: boolean;
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
            <SummaryCompareTable
              peerName={peerName}
              mine={mine}
              peer={peer}
              mineExists={mineExists}
              peerExists={peerExists}
            />
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

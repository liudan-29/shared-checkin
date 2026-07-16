"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { isSlotAlreadyInDay } from "@/lib/day-plan";
import type { PlanSlot, Slot } from "@/lib/types";

export function SyncTemplateDialog({
  open,
  onOpenChange,
  templateSlots,
  todaySlots,
  submitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateSlots: Slot[];
  todaySlots: PlanSlot[];
  submitting: boolean;
  onConfirm: (selected: Slot[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelectedIds(
        new Set(templateSlots.filter((s) => !isSlotAlreadyInDay(s, todaySlots)).map((s) => s.id))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在弹窗打开那一刻按当前数据算一次默认勾选，之后用户自己的勾选不该被重算覆盖
  }, [open]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedCount = selectedIds.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <p className="pr-6 font-display text-lg text-foreground">同步到今天</p>
        <p className="mt-1 text-sm text-muted-foreground">
          只会往今天的安排里加，不会删掉今天已有或已打卡的时段
        </p>
        <div className="mt-3 max-h-[50vh] overflow-y-auto">
          {templateSlots.length === 0 ? (
            <p className="py-8 text-center text-base text-muted-foreground">模板还是空的</p>
          ) : (
            <div className="flex flex-col gap-1">
              {templateSlots.map((slot, i) => {
                const alreadyExists = isSlotAlreadyInDay(slot, todaySlots);
                return (
                  <label
                    key={slot.id}
                    className="flex cursor-pointer items-center gap-3 py-2.5"
                    style={
                      i < templateSlots.length - 1
                        ? { borderBottom: "1px solid var(--color-border-subtle)" }
                        : undefined
                    }
                  >
                    <Checkbox
                      checked={selectedIds.has(slot.id)}
                      onCheckedChange={() => toggle(slot.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm text-muted-foreground">
                        {slot.start_time}-{slot.end_time}
                      </p>
                      <p className="truncate font-display text-base text-foreground">{slot.task}</p>
                    </div>
                    {alreadyExists && (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-sm text-muted-foreground"
                        style={{ backgroundColor: "var(--color-bg-tertiary)" }}
                      >
                        今天已有
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            size="sm"
            loading={submitting}
            loadingText="同步中…"
            disabled={selectedCount === 0}
            onClick={() => onConfirm(templateSlots.filter((s) => selectedIds.has(s.id)))}
          >
            同步{selectedCount > 0 ? `(${selectedCount})` : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

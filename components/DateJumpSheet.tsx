"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { MonthGrid } from "./MonthGrid";
import { addMonths, isAtOrBeforeMinMonth, isAtOrAfterMaxMonth } from "@/lib/calendar-grid";
import { parseDateString } from "@/lib/preview-plan";

export function DateJumpSheet({
  open,
  onOpenChange,
  viewDate,
  todayDate,
  minDate,
  maxDate,
  onSelectDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewDate: string;
  todayDate: string;
  minDate: string;
  maxDate: string;
  onSelectDate: (dateStr: string) => void;
}) {
  const initial = parseDateString(viewDate);
  const [viewMonth, setViewMonth] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });

  // 每次打开都定位到当前viewDate所在月份，不强制跳今天所在月
  useEffect(() => {
    if (open) {
      const d = parseDateString(viewDate);
      setViewMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [open, viewDate]);

  const prevDisabled = isAtOrBeforeMinMonth(viewMonth.year, viewMonth.month, minDate);
  const nextDisabled = isAtOrAfterMaxMonth(viewMonth.year, viewMonth.month, maxDate);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="flex items-center justify-between">
          <DrawerTitle>选择日期</DrawerTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="关闭"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="my-3" style={{ borderTop: "1px dashed var(--color-border-default)" }} />

        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={prevDisabled}
            onClick={() => setViewMonth((m) => addMonths(m.year, m.month, -1))}
            aria-label="上个月"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary active:scale-[0.92] disabled:pointer-events-none disabled:opacity-35"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="flex-1 text-center font-display text-lg text-foreground">
            {viewMonth.year}年{viewMonth.month + 1}月
          </span>
          <button
            type="button"
            disabled={nextDisabled}
            onClick={() => setViewMonth((m) => addMonths(m.year, m.month, 1))}
            aria-label="下个月"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary active:scale-[0.92] disabled:pointer-events-none disabled:opacity-35"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3">
          <MonthGrid
            year={viewMonth.year}
            month={viewMonth.month}
            selectedDate={viewDate}
            todayDate={todayDate}
            minDate={minDate}
            maxDate={maxDate}
            onSelectDate={(d) => {
              onSelectDate(d);
              onOpenChange(false);
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

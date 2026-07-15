"use client";

import { cn } from "@/lib/utils";
import { buildMonthGrid } from "@/lib/calendar-grid";

const WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

export function MonthGrid({
  year,
  month,
  selectedDate,
  todayDate,
  minDate,
  maxDate,
  onSelectDate,
}: {
  year: number;
  month: number;
  selectedDate: string;
  todayDate: string;
  minDate: string;
  maxDate: string;
  onSelectDate: (dateStr: string) => void;
}) {
  const cells = buildMonthGrid(year, month);

  return (
    <div>
      <div className="grid grid-cols-7 text-center">
        {WEEKDAY_NAMES.map((w) => (
          <span key={w} className="text-sm text-muted-foreground">
            {w}
          </span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-x-1 gap-y-2">
        {cells.map((cell) => {
          const isSelected = cell.dateStr === selectedDate;
          const isToday = cell.dateStr === todayDate;
          const outOfRange = cell.dateStr < minDate || cell.dateStr > maxDate;

          return (
            <button
              key={cell.dateStr}
              type="button"
              disabled={outOfRange}
              aria-label={`${month + 1}月${cell.day}日`}
              aria-current={isToday ? "date" : undefined}
              aria-pressed={isSelected}
              onClick={() => onSelectDate(cell.dateStr)}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full font-mono text-base transition-transform duration-fast ease-default",
                outOfRange
                  ? "pointer-events-none opacity-40 text-muted-foreground"
                  : "active:scale-[0.92] hover:bg-secondary",
                !outOfRange && !cell.inCurrentMonth && "text-muted-foreground",
                !outOfRange && cell.inCurrentMonth && !isSelected && !isToday && "text-foreground"
              )}
              style={
                isSelected
                  ? { backgroundColor: "var(--color-accent)", color: "var(--color-text-on-accent)", fontWeight: 600 }
                  : isToday
                  ? { border: "1.5px solid var(--color-accent)", color: "var(--color-accent)" }
                  : undefined
              }
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

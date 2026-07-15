// 日历月历网格计算：按年月生成含前后月填充的日期矩阵、月份加减。
// 与preview-plan.ts分开：那边是"按模板生成预览"，这边是纯日历几何计算，职责不同

import { formatDateString } from "./preview-plan";

export type CalendarDay = {
  dateStr: string; // YYYY-MM-DD
  day: number;
  inCurrentMonth: boolean;
};

// 生成某年某月的日历网格（周日开头，含前后月填充，补满整行）
export function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=周日
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: CalendarDay[] = [];

  // 上月填充
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const d = new Date(year, month - 1, day);
    cells.push({ dateStr: formatDateString(d), day, inCurrentMonth: false });
  }
  // 本月
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    cells.push({ dateStr: formatDateString(d), day, inCurrentMonth: true });
  }
  // 下月填充，补满到7的倍数
  const remainder = cells.length % 7;
  if (remainder > 0) {
    const need = 7 - remainder;
    for (let day = 1; day <= need; day++) {
      const d = new Date(year, month + 1, day);
      cells.push({ dateStr: formatDateString(d), day, inCurrentMonth: false });
    }
  }

  return cells;
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

// 某年月是否等于或早于minDate所在月（用于禁用"前一月"chevron）
export function isAtOrBeforeMinMonth(year: number, month: number, minDate: string): boolean {
  const [my, mm] = minDate.split("-").map(Number);
  return year < my || (year === my && month <= mm - 1);
}

// 某年月是否等于或晚于maxDate所在月（用于禁用"下一月"chevron）
export function isAtOrAfterMaxMonth(year: number, month: number, maxDate: string): boolean {
  const [my, mm] = maxDate.split("-").map(Number);
  return year > my || (year === my && month >= mm - 1);
}

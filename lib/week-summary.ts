// 周维度统计：组合调用computeDaySummary按天求和，不重新实现单日状态判定逻辑。
// 过去/今天/未来的口径只有slot-status.ts+day-summary.ts这一个真源。

import type { CycleGoal, PlanSlot } from "./types";
import { computeDaySummary } from "./day-summary";
import type { SlotStatus } from "./slot-status";

export type GoalStatus = "in_progress" | "achieved" | "missed";

export type WeekDayInput = {
  date: string;
  slots: PlanSlot[];
  mode: "past" | "current" | "future";
};

export type OverallGoalResult = {
  goalId: string;
  targetRate: number;
  achieved: boolean | null;
};

export type TaskGoalResult = {
  goalId: string;
  taskLabel: string;
  occurredCount: number; // 本周内已发生(past+current)且task匹配上的slot数
  doneCount: number; // 其中已完成数
  remainingCount: number; // 本周内该任务在future天(模板预览)里还会出现的次数
  achieved: boolean | null; // 本周未结束时是null(进行中)，周日过完才给true/false
};

export type WeekSummary = {
  weekStart: string;
  weekEnd: string;
  weekComplete: boolean;
  totalSlots: number;
  doneSlots: number;
  overdueSlots: number;
  totalOverdueMinutes: number;
  completionRate: number; // 0-1，按slot数加权求和，不是7天日完成率取平均
  overallGoalResults: OverallGoalResult[];
  taskGoalResults: TaskGoalResult[];
};

// weekEnd由调用方传入(getWeekEnd(weekStart))，避免这里重复依赖week.ts造成循环引用风险不大但保持单一职责
export function computeWeekSummary(
  weekStart: string,
  weekEnd: string,
  days: WeekDayInput[],
  goals: CycleGoal[],
  today: string,
  now: Date
): WeekSummary {
  const weekComplete = today > weekEnd;

  let totalSlots = 0;
  let doneSlots = 0;
  let overdueSlots = 0;
  let totalOverdueMinutes = 0;

  for (const day of days) {
    const daySummary = computeDaySummary(day.slots, now, day.mode);
    totalSlots += daySummary.totalSlots;
    doneSlots += daySummary.doneSlots;
    overdueSlots += daySummary.overdueSlots;
    totalOverdueMinutes += daySummary.totalOverdueMinutes;
  }

  const completionRate = totalSlots === 0 ? 0 : doneSlots / totalSlots;

  const overallGoalResults: OverallGoalResult[] = [];
  const taskGoalResults: TaskGoalResult[] = [];

  for (const goal of goals) {
    if (goal.kind === "overall_rate") {
      const achieved = weekComplete ? completionRate * 100 >= goal.target_rate : null;
      overallGoalResults.push({ goalId: goal.id, targetRate: goal.target_rate, achieved });
    } else {
      let occurredCount = 0;
      let doneCount = 0;
      let remainingCount = 0;
      for (const day of days) {
        const matched = day.slots.filter((s) => s.task === goal.task_label);
        if (day.mode === "future") {
          remainingCount += matched.length;
        } else {
          occurredCount += matched.length;
          doneCount += matched.filter((s) => s.done).length;
        }
      }
      // 周已过完但这周一次都没排上这个任务(比如目标建了但模板忘了加)：视为未达标，
      // 不能停在null(进行中)——那样这周就永远收敛不到终态了
      const achieved = weekComplete ? doneCount === occurredCount && occurredCount > 0 : null;
      taskGoalResults.push({
        goalId: goal.id,
        taskLabel: goal.task_label,
        occurredCount,
        doneCount,
        remainingCount,
        achieved,
      });
    }
  }

  return {
    weekStart,
    weekEnd,
    weekComplete,
    totalSlots,
    doneSlots,
    overdueSlots,
    totalOverdueMinutes,
    completionRate,
    overallGoalResults,
    taskGoalResults,
  };
}

// 把7天汇总成一天一格的结果，喂给WeekTicket里的PunchStrip(周概览)。
// 这天没排任何时段就不评判(not-started)；过去/今天已排的时段全部完成才算done；
// 过去没做完是missed，今天没做完是in-progress(还没到明天，不算最终结果)
export function getWeekDayOutcomes(days: WeekDayInput[]): SlotStatus[] {
  return days.map((day) => {
    if (day.mode === "future") return "not-started";
    const total = day.slots.length;
    if (total === 0) return "not-started";
    const done = day.slots.filter((s) => s.done).length;
    if (done === total) return "done";
    return day.mode === "past" ? "missed" : "in-progress";
  });
}

export function goalStatusFrom(achieved: boolean | null): GoalStatus {
  if (achieved === true) return "achieved";
  if (achieved === false) return "missed";
  return "in_progress";
}

// 把某个具体目标解析成展示用的{status, progressText}，UI层不用关心具体是哪种目标类型的计算细节
export function resolveGoalOutcome(
  summary: WeekSummary,
  goal: CycleGoal
): { status: GoalStatus; progressText: string } {
  if (goal.kind === "overall_rate") {
    const r = summary.overallGoalResults.find((g) => g.goalId === goal.id);
    return {
      status: goalStatusFrom(r?.achieved ?? null),
      progressText: `目前${Math.round(summary.completionRate * 100)}%`,
    };
  }
  const r = summary.taskGoalResults.find((g) => g.goalId === goal.id);
  if (!r) return { status: "in_progress", progressText: "" };
  const progressText =
    r.occurredCount === 0
      ? summary.weekComplete
        ? "这周没排这个任务"
        : "这周还没排这个任务"
      : `已完成${r.doneCount}/${r.occurredCount}次`;
  return { status: goalStatusFrom(r.achieved), progressText };
}

"use client";

import { cn } from "@/lib/utils";
import { formatDurationHM } from "@/lib/day-summary";
import type { WeekSummary } from "@/lib/week-summary";
import type { CycleGoal } from "@/lib/types";
import { GoalStatusTag, type GoalStatus } from "./GoalStatusTag";
import { describeGoal } from "./GoalRow";

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-subtle text-sm font-display text-ink">
      {name.slice(0, 1)}
    </span>
  );
}

function pickWinner(mine: number, peer: number, better: "higher" | "lower"): "mine" | "peer" | "tie" {
  if (mine === peer) return "tie";
  if (better === "higher") return mine > peer ? "mine" : "peer";
  return mine < peer ? "mine" : "peer";
}

function Row({
  label,
  mineText,
  peerText,
  winner,
}: {
  label: string;
  mineText: string;
  peerText: string;
  winner: "mine" | "peer" | "tie";
}) {
  const cell = (side: "mine" | "peer", text: string) =>
    winner === side ? (
      <span className="text-right font-mono text-base font-semibold text-ink">{text}</span>
    ) : (
      <span
        className={cn(
          "text-right font-mono text-base",
          winner === "tie" ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {text}
      </span>
    );

  return (
    <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {cell("mine", mineText)}
      {cell("peer", peerText)}
    </div>
  );
}

type GoalRecap = { goal: CycleGoal; status: GoalStatus };

function RecapList({ recaps, emptyText }: { recaps: GoalRecap[]; emptyText: string }) {
  if (recaps.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {recaps.map(({ goal, status }) => (
        <div key={goal.id} className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-muted-foreground">{describeGoal(goal)}</span>
          <GoalStatusTag status={status} />
        </div>
      ))}
    </div>
  );
}

export function WeeklyCompareTable({
  peerName,
  mine,
  peer,
  mineExists,
  peerExists,
  myGoalRecaps,
  peerGoalRecaps,
}: {
  peerName: string;
  mine: WeekSummary;
  peer: WeekSummary;
  mineExists: boolean;
  peerExists: boolean;
  myGoalRecaps: GoalRecap[];
  peerGoalRecaps: GoalRecap[];
}) {
  const rateText = (s: WeekSummary, exists: boolean) =>
    exists && s.totalSlots > 0 ? `${Math.round(s.completionRate * 100)}%` : "—";

  return (
    <div className="rounded-lg bg-card p-4 shadow-sm">
      <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
        <span />
        <div className="flex flex-col items-center gap-1">
          <Avatar name="我" />
          <span className="text-base text-foreground">我</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Avatar name={peerName} />
          <span className="text-base text-foreground">{peerName}</span>
        </div>
      </div>

      <div className="my-3" style={{ borderTop: "1px dashed var(--color-border-default)" }} />

      <div className="flex flex-col gap-3">
        <Row
          label="完成率"
          mineText={rateText(mine, mineExists)}
          peerText={rateText(peer, peerExists)}
          winner={pickWinner(mine.completionRate, peer.completionRate, "higher")}
        />
        <Row
          label="完成数"
          mineText={`${mine.doneSlots}/${mine.totalSlots}`}
          peerText={`${peer.doneSlots}/${peer.totalSlots}`}
          winner={pickWinner(mine.doneSlots, peer.doneSlots, "higher")}
        />
        <Row
          label="拖延次数"
          mineText={`${mine.overdueSlots}次`}
          peerText={`${peer.overdueSlots}次`}
          winner={pickWinner(mine.overdueSlots, peer.overdueSlots, "lower")}
        />
        <Row
          label="拖延时长"
          mineText={formatDurationHM(mine.totalOverdueMinutes)}
          peerText={formatDurationHM(peer.totalOverdueMinutes)}
          winner={pickWinner(mine.totalOverdueMinutes, peer.totalOverdueMinutes, "lower")}
        />
      </div>

      <div className="my-3" style={{ borderTop: "1px dashed var(--color-border-default)" }} />

      <span className="mb-2 block text-sm text-muted-foreground">目标达成</span>
      <div className="flex flex-col gap-3">
        <RecapList recaps={myGoalRecaps} emptyText="我还没设本周目标" />
        <RecapList recaps={peerGoalRecaps} emptyText={`${peerName}还没设本周目标`} />
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { formatDurationHM, type DaySummary } from "@/lib/day-summary";

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-subtle text-sm font-display text-ink">
      {name.slice(0, 1)}
    </span>
  );
}

// higher: 值越大越优（完成率/完成数）；lower: 值越小越优（拖延次数/时长）
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

export function SummaryCompareTable({
  peerName,
  mine,
  peer,
  mineExists,
  peerExists,
}: {
  peerName: string;
  mine: DaySummary;
  peer: DaySummary;
  mineExists: boolean;
  peerExists: boolean;
}) {
  const rateText = (s: DaySummary, exists: boolean) =>
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
    </div>
  );
}

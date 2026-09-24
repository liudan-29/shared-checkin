"use client";

import { cn } from "@/lib/utils";
import { formatDurationHM, type DaySummary } from "@/lib/day-summary";

export type SummaryMember = {
  id: string;
  name: string;
  summary: DaySummary;
  exists: boolean;
  isMine: boolean;
};

type Metric = {
  label: string;
  better: "higher" | "lower";
  value: (member: SummaryMember) => number;
  text: (member: SummaryMember) => string;
};

const metrics: Metric[] = [
  { label: "完成率", better: "higher", value: (m) => m.summary.completionRate, text: (m) => m.summary.totalSlots > 0 ? `${Math.round(m.summary.completionRate * 100)}%` : "—" },
  { label: "完成数", better: "higher", value: (m) => m.summary.doneSlots, text: (m) => m.summary.totalSlots > 0 ? `${m.summary.doneSlots}/${m.summary.totalSlots}` : "—" },
  { label: "拖延次数", better: "lower", value: (m) => m.summary.overdueSlots, text: (m) => m.summary.totalSlots > 0 ? `${m.summary.overdueSlots}次` : "—" },
  { label: "拖延时长", better: "lower", value: (m) => m.summary.totalOverdueMinutes, text: (m) => m.summary.totalSlots > 0 ? formatDurationHM(m.summary.totalOverdueMinutes) : "—" },
];

function bestIds(members: SummaryMember[], metric: Metric): Set<string> {
  const available = members.filter((m) => m.summary.totalSlots > 0);
  if (!available.length) return new Set();
  const values = available.map(metric.value);
  const best = metric.better === "higher" ? Math.max(...values) : Math.min(...values);
  return new Set(available.filter((m) => metric.value(m) === best).map((m) => m.id));
}

function Avatar({ name }: { name: string }) {
  return <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-subtle text-sm font-display text-ink">{name.slice(0, 1)}</span>;
}

export function SummaryCompareTable({ members }: { members: SummaryMember[] }) {
  return (
    <div className="rounded-lg bg-card p-4 shadow-sm">
      <div className="hidden sm:block">
        <div className="grid grid-cols-[96px_repeat(3,minmax(0,1fr))] items-center gap-2">
          <span />
          {members.map((member) => (
            <div key={member.id} className="flex min-w-0 flex-col items-center gap-1">
              <Avatar name={member.isMine ? "我" : member.name} />
              <span className="max-w-full truncate text-base text-foreground">{member.isMine ? "我" : member.name}</span>
            </div>
          ))}
        </div>
        <div className="my-3" style={{ borderTop: "1px dashed var(--color-border-default)" }} />
        <div className="flex flex-col gap-3">
          {metrics.map((metric) => {
            const winners = bestIds(members, metric);
            return (
              <div key={metric.label} className="grid grid-cols-[96px_repeat(3,minmax(0,1fr))] items-center gap-2">
                <span className="text-sm text-muted-foreground">{metric.label}</span>
                {members.map((member) => (
                  <span key={member.id} className={cn("text-right font-mono text-base", winners.has(member.id) ? "font-semibold text-ink" : "text-muted-foreground")}>{metric.text(member)}</span>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid gap-3 sm:hidden">
        {members.map((member) => (
          <div key={member.id} className="rounded-md p-3" style={{ backgroundColor: "var(--color-bg-tertiary)" }}>
            <div className="mb-2 flex items-center gap-2"><Avatar name={member.isMine ? "我" : member.name} /><span className="truncate text-base text-foreground">{member.isMine ? "我" : member.name}</span></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {metrics.map((metric) => {
                const winners = bestIds(members, metric);
                return (
                  <div key={metric.label} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">{metric.label}</span>
                    <span className={cn("font-mono text-sm", winners.has(member.id) ? "font-semibold text-ink" : "text-foreground")}>{metric.text(member)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

// 双方备注合并成一条时间线（不分栏），呼应"共享打卡"的产品概念
export type NoteEntry = {
  who: string; // 头像首字用
  time: string; // 打卡时间 HH:mm
  task: string;
  note: string;
};

export function SummaryNotesList({ entries }: { entries: NoteEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg bg-card p-4 shadow-sm">
        <p className="py-6 text-center text-base text-muted-foreground">这天没有人写备注</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card p-4 shadow-sm">
      {entries.map((e, i) => (
        <div
          key={i}
          className="py-3"
          style={
            i < entries.length - 1
              ? { borderBottom: "1px solid var(--color-border-subtle)" }
              : undefined
          }
        >
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-subtle text-xs font-display text-ink">
              {e.who.slice(0, 1)}
            </span>
            <span className="font-mono text-sm text-muted-foreground">{e.time}</span>
            <span className="truncate text-sm text-muted-foreground">
              ·{e.task}
            </span>
          </div>
          <p className="mt-1 line-clamp-3 text-base text-foreground">{e.note}</p>
        </div>
      ))}
    </div>
  );
}

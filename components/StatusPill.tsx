export function StatusPill() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-body"
      style={{ backgroundColor: "var(--color-accent)", color: "var(--color-text-on-accent)" }}
    >
      <span className="h-1.5 w-1.5 animate-pulse-ring rounded-full bg-current" />
      进行中
    </span>
  );
}

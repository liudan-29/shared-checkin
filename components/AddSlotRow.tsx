export function AddSlotRow({
  onClick,
  label = "＋ 添加时段",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[52px] w-full items-center justify-center rounded-lg text-base text-muted-foreground transition-colors duration-fast ease-default hover:text-ink"
      style={{ border: "1.5px dashed var(--color-border-default)" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border-default)")}
    >
      {label}
    </button>
  );
}

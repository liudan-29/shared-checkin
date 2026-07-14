"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function CheckButton({
  onClick,
  disabled,
  active,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="打卡"
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card transition-all duration-fast ease-default hover:[&>svg]:text-ink active:scale-[0.92] disabled:opacity-50",
        active ? "border-2" : "border-[1.5px]"
      )}
      style={{
        borderColor: active ? "var(--color-accent)" : "var(--color-border-default)",
      }}
    >
      <Check
        className="h-5 w-5"
        style={{ color: active ? "var(--color-accent)" : "var(--color-text-muted)" }}
      />
    </button>
  );
}

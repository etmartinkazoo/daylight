import { cn } from "@/lib/utils.js";

export function StatCard({ label, value, color, danger }) {
  return (
    <div
      className={cn(
        "bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col gap-1 transition-shadow hover:shadow-[var(--shadow-md)]",
        danger && "border-[var(--color-danger-border)]",
      )}
    >
      <span className="text-[0.8125rem] font-medium text-[var(--color-muted)]">{label}</span>
      <span
        className={cn(
          "text-[1.75rem] font-bold leading-none tabular-nums tracking-tight",
          danger ? "text-[var(--color-danger)]" : "text-[var(--color-fg)]",
        )}
        style={color && !danger ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

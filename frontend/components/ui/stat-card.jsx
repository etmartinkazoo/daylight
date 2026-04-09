import { cn } from "@/lib/utils.js";

const valueClass = {
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-500 dark:text-amber-400",
  muted: "text-muted-foreground",
};

export function StatCard({ label, value, variant, color, danger }) {
  return (
    <div className={cn("flex flex-col gap-2 px-5 py-4", danger && "bg-destructive/[0.035]")}>
      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground leading-none">
        {label}
      </span>
      <span
        className={cn(
          "text-[22px] font-bold tabular-nums leading-none tracking-tight",
          danger
            ? "text-destructive"
            : variant
              ? valueClass[variant]
              : "text-foreground",
        )}
        style={color && !danger && !variant ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

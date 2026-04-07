import { cn } from "@/lib/utils.js";

const OPTIONS = [
  { value: 0, label: "Off" },
  { value: 5000, label: "5s" },
  { value: 10000, label: "10s" },
  { value: 30000, label: "30s" },
  { value: 60000, label: "60s" },
];

export function AutoRefresh({ interval, onChange }) {
  const active = interval > 0;
  return (
    <div className="flex items-center gap-2">
      {active && (
        <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse shrink-0" />
      )}
      <div className="flex bg-[var(--color-accent)] rounded-lg p-[0.1875rem] gap-[0.125rem]">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md border-none cursor-pointer transition-all font-[inherit]",
              interval === opt.value
                ? "bg-[var(--color-bg)] text-[var(--color-fg)] shadow-sm"
                : "bg-transparent text-[var(--color-muted)] hover:text-[var(--color-fg)]",
            )}
            onClick={() => onChange?.(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

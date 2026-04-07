import { cn } from "@/lib/utils.js";

export function BulkActions({ count, actions = [], onCancel }) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--color-accent)] border border-[var(--color-border)] rounded-xl">
      <span className="text-sm font-semibold text-[var(--color-fg)]">
        {count} selected
      </span>
      <div className="flex items-center gap-2 ml-auto">
        {actions.map((action, i) => (
          <button
            key={i}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors font-[inherit]",
              action.variant === "danger"
                ? "bg-[var(--color-danger-subtle)] text-[var(--color-danger-hover)] border-[var(--color-danger-border)] hover:bg-[var(--color-danger-bg)]"
                : "bg-[var(--color-bg)] text-[var(--color-fg-tertiary)] border-[var(--color-border)] hover:bg-[var(--color-surface)]",
            )}
            onClick={action.onclick}
          >
            {action.label}
          </button>
        ))}
        <button
          className="px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] rounded-lg border border-transparent cursor-pointer hover:text-[var(--color-fg)] bg-transparent font-[inherit]"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

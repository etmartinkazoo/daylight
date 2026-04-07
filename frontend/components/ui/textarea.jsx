import { cn } from "@/lib/utils.js";

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-fg)] placeholder:text-[var(--color-muted-light)] transition-colors resize-none",
        "focus:outline-none focus:border-[var(--color-focus)] focus:ring-2 focus:ring-[var(--color-focus-ring)]",
        "disabled:opacity-50 disabled:pointer-events-none",
        className,
      )}
      {...props}
    />
  );
}

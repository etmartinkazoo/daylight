import { cn } from "@/lib/utils";

/**
 * A label/value row used inside sheet panels and detail cards.
 * Wrap multiple DetailRows in a `div.flex.flex-col.divide-y`.
 */
export function DetailRow({ label, children, className, valueClassName }) {
  return (
    <div className={cn("flex items-center justify-between py-3 text-sm", className)}>
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn("text-right", valueClassName)}>{children}</span>
    </div>
  );
}

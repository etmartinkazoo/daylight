import { Link } from "@inertiajs/react";
import { cn } from "@/lib/utils.js";

export function TabsNav({ value, tabs, href, data = {}, counts = {}, extra }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-0 border-b border-[var(--color-border)] px-4">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={href}
            data={{ ...data, status: tab.key }}
            preserveState={true}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap no-underline",
              value === tab.key
                ? "text-[var(--color-primary)] border-[var(--color-primary)]"
                : "text-[var(--color-muted)] border-transparent hover:text-[var(--color-fg)]",
            )}
          >
            {tab.label}
            {tab.key !== "all" && counts[tab.key] ? (
              <span className="text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-muted)] px-1.5 py-0.5 rounded-full">
                {counts[tab.key]}
              </span>
            ) : null}
          </Link>
        ))}
        {extra && <div className="ml-auto flex gap-2 pb-1">{extra}</div>}
      </div>
    </div>
  );
}

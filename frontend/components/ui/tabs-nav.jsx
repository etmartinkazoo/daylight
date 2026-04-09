import { Link } from "@inertiajs/react";
import { cn } from "@/lib/utils.js";
import { Badge } from "@/components/ui/badge";

export function TabsNav({ value, tabs, href, data = {}, counts = {}, extra }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-0 border-b px-4">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={href}
            data={{ ...data, status: tab.key }}
            preserveState={true}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap no-underline",
              value === tab.key
                ? "text-primary border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.key !== "all" && counts[tab.key] ? (
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                {counts[tab.key]}
              </Badge>
            ) : null}
          </Link>
        ))}
        {extra && <div className="ml-auto flex gap-2 pb-1">{extra}</div>}
      </div>
    </div>
  );
}

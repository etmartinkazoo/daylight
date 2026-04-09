import { Link, usePage } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import { ExportButton } from "@/components/ui/export-button";

export default function ErrorsLayout({ children }) {
  const { props: pageProps } = usePage();
  const base = pageProps?.base_path || "/daylight";
  const counts = pageProps?.counts || {};
  const status = pageProps?.status || "open";

  const total = (counts.open || 0) + (counts.resolved || 0) + (counts.ignored || 0);

  const tabs = [
    { key: "open",     label: "Open",     href: `${base}/errors`,          count: counts.open     || 0, danger: (counts.open || 0) > 0 },
    { key: "resolved", label: "Resolved", href: `${base}/errors/resolved`, count: counts.resolved || 0 },
    { key: "ignored",  label: "Ignored",  href: `${base}/errors/ignored`,  count: counts.ignored  || 0 },
    { key: "all",      label: "All",      href: `${base}/errors/all`,      count: total },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div>
          <h1 className="text-base font-semibold">Errors</h1>
          <p className="text-sm text-muted-foreground">Track, triage and resolve application errors</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton baseUrl={`${base}/errors/export`} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b px-4 shrink-0">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors border-b-2 -mb-px",
              status === tab.key
                ? "border-foreground text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={cn(
                "text-xs font-semibold tabular-nums",
                status === tab.key
                  ? "text-foreground"
                  : tab.danger
                    ? "text-destructive"
                    : "text-muted-foreground",
              )}>
                {tab.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-w-0">
        {children}
      </div>
    </div>
  );
}

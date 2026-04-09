import { router, usePage } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import { ExportButton } from "@/components/ui/export-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ErrorsLayout({ children }) {
  const { props: pageProps } = usePage();
  const base = pageProps?.base_path || "/daylight";
  const counts = pageProps?.counts || {};
  const status = pageProps?.status || "open";

  const total =
    (counts.open || 0) + (counts.resolved || 0) + (counts.ignored || 0);

  const tabs = [
    {
      key: "open",
      label: "Open",
      href: `${base}/errors`,
      count: counts.open || 0,
      danger: (counts.open || 0) > 0,
    },
    {
      key: "resolved",
      label: "Resolved",
      href: `${base}/errors/resolved`,
      count: counts.resolved || 0,
    },
    {
      key: "ignored",
      label: "Ignored",
      href: `${base}/errors/ignored`,
      count: counts.ignored || 0,
    },
    { key: "all", label: "All", href: `${base}/errors/all`, count: total },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4 shrink-0">
        <div>
          <h1 className="text-base font-semibold">Errors</h1>
          <p className="text-sm text-muted-foreground">
            Track, triage and resolve application errors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton baseUrl={`${base}/errors/export`} />
        </div>
      </div>

      {/* Tab bar */}
      <Tabs
        value={status}
        onValueChange={(key) => {
          const tab = tabs.find((t) => t.key === key);
          if (tab) router.visit(tab.href);
        }}
        className="shrink-0 gap-0"
      >
        <TabsList className="mx-4 my-3">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={cn(
                    "text-xs font-semibold tabular-nums",
                    status === tab.key
                      ? "text-foreground"
                      : tab.danger
                        ? "text-destructive"
                        : "text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Content */}
      <div className="flex-1 overflow-auto min-w-0">{children}</div>
    </div>
  );
}

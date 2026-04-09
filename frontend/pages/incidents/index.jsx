import { router, InfiniteScroll } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import AppLayout from "@/layouts/app-layout";
import PeriodSelect from "@/components/PeriodSelect";
import IncidentCard from "@/components/incidents/IncidentCard";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { InteractiveBarChart } from "@/components/charts/InteractiveBarChart";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page-header";

export default function IncidentsIndex({
  incidents = [], counts = {}, status = "all", period = "24h",
  incident_series = [], base_path: base = "/daylight",
}) {
  const tabs = [
    { key: "open", label: "Open" },
    { key: "investigating", label: "Investigating" },
    { key: "resolved", label: "Resolved" },
    { key: "false_alarm", label: "False Alarm" },
    { key: "all", label: "All" },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">

        <PageHeader
          title="Incident Autopsies"
          description="AI-investigated incidents and anomaly reports"
          actions={<PeriodSelect value={period} onChange={(p) => router.get(`${base}/incidents`, { period: p, status }, { preserveState: true })} />}
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 overflow-hidden rounded-xl border divide-x divide-y sm:divide-y-0 divide-border bg-card">
          <StatCard label="Open" value={counts.open || 0} danger={counts.open > 0} />
          <StatCard label="Investigating" value={counts.investigating || 0} variant={counts.investigating > 0 ? "warning" : undefined} />
          <StatCard label="Resolved" value={counts.resolved || 0} variant="success" />
          <StatCard label="False Alarm" value={counts.false_alarm || 0} variant="muted" />
        </div>

        {incident_series.length > 0 && (
          <InteractiveBarChart
            data={incident_series.map((d) => ({ ...d, incidents: d.v }))}
            series={[{ key: "incidents", label: "Incidents", color: "#f59e0b" }]}
            title="Incident Volume"
            description="Incidents detected over time"
            height={250}
          />
        )}

        <ToggleGroup type="single" value={status} onValueChange={(v) => v && router.get(`${base}/incidents`, { period, status: v }, { preserveState: true })}>
          {tabs.map((tab) => (
            <ToggleGroupItem key={tab.key} value={tab.key}>
              {tab.label}
              {tab.key !== "all" && counts[tab.key] > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-sm h-4 px-1">{counts[tab.key]}</Badge>
              )}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {incidents.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia><HugeiconsIcon icon={Alert02Icon} /></EmptyMedia>
              <EmptyTitle>No incidents found</EmptyTitle>
              <EmptyDescription>No incidents to show for this filter and time period.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <InfiniteScroll data="incidents" itemsElement="#incidents-list" startElement="#incidents-start">
            <div id="incidents-start" className="flex flex-col gap-3">
              <div id="incidents-list" className="flex flex-col gap-3">
                {incidents.map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    onClick={() => router.get(`${base}/incidents/${incident.id}`)}
                  />
                ))}
              </div>
            </div>
          </InfiniteScroll>
        )}
      </div>
    </AppLayout>
  );
}

import { router, InfiniteScroll } from "@inertiajs/react";
import DaylightLayout from "../DaylightLayout";
import PeriodSelect from "../PeriodSelect";
import IncidentCard from "./IncidentCard";
import { StatCard } from "@/components/ui/stat-card";
import { TabsNav } from "@/components/ui/tabs-nav";
import InteractiveBarChart from "@/components/charts/InteractiveBarChart";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

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
    <DaylightLayout>
      <div className="dl-page">
        <div className="dl-page-header">
          <div>
            <h1 className="dl-page-title">Incident Autopsies</h1>
            <p className="dl-page-subtitle">AI-investigated incidents and anomaly reports</p>
          </div>
          <PeriodSelect value={period} onChange={(p) => router.get(`${base}/incidents`, { period: p, status }, { preserveState: true })} />
        </div>

        <div className="stats-cards" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" }}>
          <StatCard label="Open" value={counts.open || 0} danger={counts.open > 0} />
          <StatCard label="Investigating" value={counts.investigating || 0} color={counts.investigating > 0 ? "var(--color-warning-dark)" : ""} />
          <StatCard label="Resolved" value={counts.resolved || 0} color="var(--color-success)" />
          <StatCard label="False Alarm" value={counts.false_alarm || 0} color="var(--color-muted)" />
        </div>

        {incident_series.length > 0 && (
          <InteractiveBarChart
            data={incident_series.map((d) => ({ ...d, incidents: d.v }))}
            series={[{ key: "incidents", label: "Incidents", color: "var(--color-warning)" }]}
            title="Incident Volume"
            description="Incidents detected over time"
            height={250}
          />
        )}

        <TabsNav value={status} tabs={tabs} href={`${base}/incidents`} data={{ period }} counts={counts} />

        {incidents.length === 0 ? (
          <div className="empty">
            <span><HugeiconsIcon icon={Alert02Icon} size={48} /></span>
            <p>No incidents found</p>
            <p>No incidents to show for this filter and time period.</p>
          </div>
        ) : (
          <InfiniteScroll data="incidents" itemsElement="#incidents-list" startElement="#incidents-start">
            <div id="incidents-start" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div id="incidents-list">
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
    </DaylightLayout>
  );
}

<script>
  import { router, usePage, InfiniteScroll } from "@inertiajs/svelte";
  import DaylightLayout from "../DaylightLayout.svelte";
  import PeriodSelect from "../PeriodSelect.svelte";
  import IncidentCard from "./IncidentCard.svelte";
  import StatCard from "@/components/ui/StatCard.svelte";
  import Tabs from "@/components/ui/Tabs.svelte";
  import InteractiveBarChart from "@/components/charts/InteractiveBarChart.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { Alert02Icon } from "@hugeicons/core-free-icons";

  let { incidents = [], counts = {}, status = "all", period = "24h", incident_series = [] } = $props();
  const pageStore = usePage();
  let base = $derived($pageStore.props?.base_path || "/daylight");

  function changePeriod(p) {
    router.get(`${base}/incidents`, { period: p, status }, { preserveState: true });
  }

  function viewIncident(incident) {
    router.get(`${base}/incidents/${incident.id}`);
  }

  const tabs = [
    { key: "open", label: "Open" },
    { key: "investigating", label: "Investigating" },
    { key: "resolved", label: "Resolved" },
    { key: "false_alarm", label: "False Alarm" },
    { key: "all", label: "All" },
  ];

  let chartData = $derived(
    incident_series.map(d => ({ ...d, incidents: d.v }))
  );
</script>

<svelte:head><title>Incident Autopsies — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Incident Autopsies</h1>
        <p class="page-subtitle">AI-investigated incidents and anomaly reports</p>
      </div>
      <PeriodSelect value={period} onchange={changePeriod} />
    </div>

    <div class="stats-cards">
      <StatCard label="Open" value={counts.open || 0} danger={counts.open > 0} />
      <StatCard label="Investigating" value={counts.investigating || 0} color={counts.investigating > 0 ? "var(--color-warning-dark)" : ""} />
      <StatCard label="Resolved" value={counts.resolved || 0} color="var(--color-success)" />
      <StatCard label="False Alarm" value={counts.false_alarm || 0} color="var(--color-muted)" />
    </div>

    {#if incident_series.length > 0}
      <InteractiveBarChart
        data={chartData}
        series={[{ key: "incidents", label: "Incidents", color: "var(--color-warning)" }]}
        title="Incident Volume"
        description="Incidents detected over time"
        height={250}
      />
    {/if}

    <Tabs
      value={status}
      {tabs}
      href={`${base}/incidents`}
      data={{ period }}
      {counts}
    />

    {#if incidents.length === 0}
      <div class="empty">
        <span><HugeiconsIcon icon={Alert02Icon} size={48} /></span>
        <p>No incidents found</p>
        <p>No incidents to show for this filter and time period.</p>
      </div>
    {:else}
      <InfiniteScroll data="incidents" itemsElement="#incidents-list" startElement="#incidents-start">
        <div class="incident-list" id="incidents-start">
          <div id="incidents-list">
            {#each incidents as incident (incident.id)}
              <IncidentCard {incident} onclick={() => viewIncident(incident)} />
            {/each}
          </div>
        </div>
      </InfiniteScroll>
    {/if}
  </div>
</DaylightLayout>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .page-title {
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--color-fg);
    margin: 0;
    letter-spacing: -0.02em;
  }

  .page-subtitle {
    font-size: 0.8125rem;
    color: var(--color-muted);
    margin: 0.25rem 0 0;
  }

  .stats-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }

  .incident-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .empty {
    text-align: center;
    padding: 4rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;

    span { color: var(--color-muted-light); }
    p:first-of-type { font-size: 1rem; font-weight: 600; color: var(--color-fg); margin: 0; }
    p:last-of-type { font-size: 0.8125rem; color: var(--color-muted); margin: 0; }
  }

  @media (max-width: 768px) {
    .stats-cards { grid-template-columns: repeat(2, 1fr); }
    .page-header { flex-direction: column; }
  }
</style>

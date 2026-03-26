<script>
  import { router, usePage } from "@inertiajs/svelte";
  import DaylightLayout from "./DaylightLayout.svelte";
  import PeriodSelect from "./PeriodSelect.svelte";
  import InteractiveBarChart from "@/components/charts/InteractiveBarChart.svelte";
  import InfiniteScroll from "@/components/ui/InfiniteScroll.svelte";

  let { incidents = [], counts = {}, status = "all", period = "24h", incident_series = [], page = 1, has_more = false } = $props();
  const pageStore = usePage();
  let base = $derived($pageStore.props?.base_path || "/daylight");

  function changePeriod(p) {
    router.get(`${base}/incidents`, { period: p, status }, { preserveState: true });
  }

  function changeStatus(s) {
    router.get(`${base}/incidents`, { status: s, period }, { preserveState: true });
  }

  function viewIncident(incident) {
    router.get(`${base}/incidents/${incident.id}`);
  }

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`;
  }

  const tabs = [
    { key: "open", label: "Open" },
    { key: "investigating", label: "Investigating" },
    { key: "resolved", label: "Resolved" },
    { key: "false_alarm", label: "False Alarm" },
    { key: "all", label: "All" },
  ];

  const severityColors = {
    critical: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };

  const typeBadgeColors = {
    "Error Spike": { bg: "#fef2f2", color: "#dc2626" },
    "New Error": { bg: "#fef2f2", color: "#dc2626" },
    "Latency Spike": { bg: "#fffbeb", color: "#d97706" },
    "Failure Spike": { bg: "#fef2f2", color: "#dc2626" },
  };

  const statusBadgeStyles = {
    open: { bg: "#fef2f2", color: "#dc2626" },
    investigating: { bg: "#fffbeb", color: "#d97706" },
    resolved: { bg: "#f0fdf4", color: "#16a34a" },
    false_alarm: { bg: "#f1f5f9", color: "#64748b" },
  };

  function getTypeBadge(type) {
    return typeBadgeColors[type] || { bg: "#f1f5f9", color: "#64748b" };
  }

  function getStatusBadge(s) {
    return statusBadgeStyles[s] || { bg: "#f1f5f9", color: "#64748b" };
  }

  let allIncidents = $state(incidents);
  let currentPage = $state(page);
  let loadingMore = $state(false);

  $effect(() => {
    status; period;
    allIncidents = incidents;
    currentPage = page;
  });

  function loadMore() {
    if (loadingMore || !has_more) return;
    loadingMore = true;
    router.get(`${base}/incidents`, { status, period, page: currentPage + 1 }, {
      preserveState: true,
      preserveScroll: true,
      only: ['incidents', 'page', 'has_more'],
      onSuccess: (p) => {
        const newItems = p.props.incidents || [];
        allIncidents = [...allIncidents, ...newItems];
        currentPage = p.props.page;
        has_more = p.props.has_more;
        loadingMore = false;
      },
      onError: () => { loadingMore = false; }
    });
  }

  let chartData = $derived(
    incident_series.map(d => ({ ...d, incidents: d.v }))
  );
</script>

<svelte:head><title>Incident Autopsies — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="incidents-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Incident Autopsies</h1>
        <p class="page-subtitle">AI-investigated incidents and anomaly reports</p>
      </div>
      <PeriodSelect value={period} onchange={changePeriod} />
    </div>

    <!-- Stat Cards -->
    <div class="stat-cards">
      <div class="stat-card" class:stat-card-danger={counts.open > 0}>
        <span class="stat-card-label">Open</span>
        <span class="stat-card-value" style="color: {counts.open > 0 ? '#ef4444' : '#0f172a'}">{counts.open || 0}</span>
      </div>
      <div class="stat-card stat-card-investigating">
        <span class="stat-card-label">
          Investigating
          {#if counts.investigating > 0}
            <span class="pulse-dot"></span>
          {/if}
        </span>
        <span class="stat-card-value" style="color: {counts.investigating > 0 ? '#d97706' : '#0f172a'}">{counts.investigating || 0}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Resolved</span>
        <span class="stat-card-value" style="color: #22c55e">{counts.resolved || 0}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">False Alarm</span>
        <span class="stat-card-value" style="color: #94a3b8">{counts.false_alarm || 0}</span>
      </div>
    </div>

    <!-- Chart -->
    {#if incident_series.length > 0}
      <InteractiveBarChart
        data={chartData}
        series={[{ key: "incidents", label: "Incidents", color: "#f59e0b" }]}
        title="Incident Volume"
        description="Incidents detected over time"
        height={250}
      />
    {/if}

    <!-- Tabs -->
    <div class="tabs-row">
      <div class="tabs">
        {#each tabs as tab (tab.key)}
          <button class="tab" class:active={status === tab.key} onclick={() => changeStatus(tab.key)}>
            {tab.label}
            {#if tab.key !== "all" && counts[tab.key]}<span class="tab-count">{counts[tab.key]}</span>{/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Incident Cards -->
    {#if allIncidents.length === 0}
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <p class="empty-title">No incidents found</p>
        <p class="empty-sub">No incidents to show for this filter and time period.</p>
      </div>
    {:else}
      <div class="incident-list">
        {#each allIncidents as incident (incident.id)}
          {@const sevColor = severityColors[incident.severity] || "#64748b"}
          {@const typeBadge = getTypeBadge(incident.incident_type)}
          {@const statusBadge = getStatusBadge(incident.status)}
          <button
            class="incident-card"
            class:incident-card-investigating={incident.status === "investigating"}
            class:incident-card-critical={incident.severity === "critical"}
            onclick={() => viewIncident(incident)}
          >
            <!-- Severity bar -->
            <div class="severity-bar" style="background: {sevColor}"></div>

            <div class="incident-content">
              <!-- Top row: badges + time -->
              <div class="incident-top">
                <div class="incident-badges">
                  <span class="severity-badge" style="background: {sevColor}15; color: {sevColor}; border: 1px solid {sevColor}30">
                    {incident.severity}
                  </span>
                  <span class="type-badge" style="background: {typeBadge.bg}; color: {typeBadge.color}">
                    {incident.incident_type}
                  </span>
                  <span class="status-badge" style="background: {statusBadge.bg}; color: {statusBadge.color}">
                    {#if incident.status === "investigating"}
                      <span class="status-spinner"></span>
                    {/if}
                    {incident.status === "false_alarm" ? "False Alarm" : incident.status}
                  </span>
                </div>
                <span class="incident-time">{timeAgo(incident.started_at)}</span>
              </div>

              <!-- Title -->
              <h3 class="incident-title">{incident.title}</h3>

              <!-- Summary -->
              {#if incident.summary}
                <p class="incident-summary">{incident.summary}</p>
              {/if}

              <!-- Footer -->
              <div class="incident-footer">
                {#if incident.status === "investigating"}
                  <span class="investigating-label">
                    <span class="investigating-spinner"></span>
                    Investigating...
                  </span>
                {:else if incident.investigation}
                  <span class="view-report">View Report &rarr;</span>
                {:else}
                  <span class="incident-meta">{incident.started_at ? new Date(incident.started_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                {/if}
              </div>
            </div>
          </button>
        {/each}
        <InfiniteScroll loading={loadingMore} hasMore={has_more} onLoadMore={loadMore} />
      </div>
    {/if}
  </div>
</DaylightLayout>

<style>
  .incidents-page { display: flex; flex-direction: column; gap: 1.5rem; }

  .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .page-title { font-size: 1.375rem; font-weight: 700; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
  .page-subtitle { font-size: 0.8125rem; color: #64748b; margin: 0.25rem 0 0; }

  /* Stat Cards */
  .stat-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
  }
  .stat-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    transition: box-shadow 0.15s ease;
  }
  .stat-card:hover {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.06);
  }
  .stat-card-danger {
    border-color: #fecaca;
    background: #fff5f5;
  }
  .stat-card-investigating {
    border-color: #fde68a;
    background: #fffbeb;
  }
  .stat-card-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .stat-card-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.02em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  /* Pulse dot */
  .pulse-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: #f59e0b;
    display: inline-block;
    animation: pulse-glow 2s ease-in-out infinite;
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
    50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
  }

  /* Tabs */
  .tabs-row { display: flex; align-items: center; gap: 1rem; }
  .tabs {
    display: flex;
    gap: 0.125rem;
    background: #f1f5f9;
    border-radius: 0.5rem;
    padding: 0.1875rem;
  }
  .tab {
    padding: 0.375rem 0.875rem;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: inherit;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }
  .tab:hover { color: #0f172a; }
  .tab.active {
    background: #fff;
    color: #0f172a;
    font-weight: 600;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }
  .tab-count {
    font-size: 0.6875rem;
    font-weight: 600;
    background: #e2e8f0;
    color: #475569;
    padding: 0.0625rem 0.375rem;
    border-radius: 9999px;
    font-variant-numeric: tabular-nums;
  }
  .tab.active .tab-count {
    background: #0f172a;
    color: #fff;
  }

  /* Incident List */
  .incident-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  /* Incident Card */
  .incident-card {
    display: flex;
    align-items: stretch;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    font-family: inherit;
    width: 100%;
    padding: 0;
  }
  .incident-card:hover {
    box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
    transform: translateY(-1px);
    border-color: #cbd5e1;
  }
  .incident-card-investigating {
    border-color: #fde68a;
    animation: border-pulse 3s ease-in-out infinite;
  }
  @keyframes border-pulse {
    0%, 100% { border-color: #fde68a; }
    50% { border-color: #f59e0b; }
  }
  .incident-card-critical {
    background: #fffbfb;
  }

  /* Severity Bar */
  .severity-bar {
    width: 4px;
    flex-shrink: 0;
  }

  /* Incident Content */
  .incident-content {
    flex: 1;
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }

  .incident-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .incident-badges {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .severity-badge {
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.1875rem 0.5rem;
    border-radius: 9999px;
  }
  .type-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.1875rem 0.5rem;
    border-radius: 9999px;
  }
  .status-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.1875rem 0.5rem;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .status-spinner {
    width: 0.5rem;
    height: 0.5rem;
    border: 1.5px solid #d97706;
    border-top-color: transparent;
    border-radius: 50%;
    display: inline-block;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .incident-time {
    font-size: 0.75rem;
    color: #94a3b8;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  .incident-title {
    font-size: 0.9375rem;
    font-weight: 650;
    color: #0f172a;
    margin: 0;
    line-height: 1.3;
  }

  .incident-summary {
    font-size: 0.8125rem;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .incident-footer {
    display: flex;
    align-items: center;
    margin-top: 0.25rem;
  }

  .investigating-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #d97706;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }

  .investigating-spinner {
    width: 0.75rem;
    height: 0.75rem;
    border: 2px solid #fde68a;
    border-top-color: #f59e0b;
    border-radius: 50%;
    display: inline-block;
    animation: spin 0.8s linear infinite;
  }

  .view-report {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #3b82f6;
  }
  .incident-card:hover .view-report {
    color: #1d4ed8;
    text-decoration: underline;
  }

  .incident-meta {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    text-align: center;
  }
  .empty-icon { margin-bottom: 1rem; }
  .empty-title { font-size: 0.9375rem; font-weight: 600; color: #0f172a; margin: 0; }
  .empty-sub { font-size: 0.8125rem; color: #94a3b8; margin: 0.25rem 0 0; }

  /* Responsive */
  @media (max-width: 768px) {
    .stat-cards { grid-template-columns: repeat(2, 1fr); }
    .page-header { flex-direction: column; }
  }
</style>

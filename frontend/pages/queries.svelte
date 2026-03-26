<script>
  import { router, usePage } from "@inertiajs/svelte";
  import DaylightLayout from "./DaylightLayout.svelte";
  import Badge from "@/components/ui/Badge.svelte";
  import Button from "@/components/ui/Button.svelte";
  import Table from "@/components/ui/Table.svelte";
  import SortableHeader from "@/components/ui/SortableHeader.svelte";
  import PeriodSelect from "./PeriodSelect.svelte";
  import EwSheet from "./EwSheet.svelte";
  import BarList from "@/components/charts/BarList.svelte";
  import TimeSeriesChart from "@/components/charts/TimeSeriesChart.svelte";
  import InteractiveBarChart from "@/components/charts/InteractiveBarChart.svelte";
  import ExportButton from "@/components/ui/ExportButton.svelte";

  let { queries = [], slowest = [], period = "24h", total_queries = 0, volume_series = [], n_plus_one_requests = [] } = $props();
  const pageStore = usePage();
  let base = $derived($pageStore.props?.base_path || "/daylight");

  let sheetOpen = $state(false);
  let sheetItem = $state(null);

  let avgDuration = $derived(queries.length > 0 ? queries.reduce((s, q) => s + (q.avg_duration || 0), 0) / queries.length : 0);
  let maxDuration = $derived(queries.length > 0 ? Math.max(...queries.map(q => q.max_duration || 0)) : 0);

  let topQueries = $derived(
    queries.slice().sort((a, b) => (b.avg_duration || 0) - (a.avg_duration || 0)).slice(0, 5).map(q => ({
      label: q.normalized_sql?.substring(0, 60) || "Unknown",
      value: q.avg_duration || 0,
    }))
  );

  function changePeriod(p) { router.get(`${base}/queries`, { period: p }, { preserveState: true }); }
  function fmt(ms) { if (ms == null) return "\u2014"; return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`; }
  function timeAgo(d) { if (!d) return ""; const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return `${m}m`; return `${Math.floor(m / 60)}h`; }

  function openQuery(q) { sheetItem = q; sheetOpen = true; }
</script>

<svelte:head><title>Queries — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Slow Queries</h1>
        <p class="page-subtitle">Queries exceeding 50ms threshold in the last {period}</p>
      </div>
      <div class="header-controls">
        <ExportButton baseUrl={`${base}/queries/export`} />
        <PeriodSelect value={period} onchange={changePeriod} />
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="stat-grid">
      <div class="stat-card">
        <span class="stat-card-label">Total Slow Queries</span>
        <span class="stat-card-value">{total_queries.toLocaleString()}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Unique Patterns</span>
        <span class="stat-card-value">{queries.length.toLocaleString()}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Avg Duration</span>
        <span class="stat-card-value">{fmt(avgDuration)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Slowest Query</span>
        <span class="stat-card-value danger">{fmt(maxDuration)}</span>
      </div>
    </div>

    <!-- Query Volume Chart -->
    {#if volume_series.length > 0}
      <InteractiveBarChart
        data={volume_series.map(d => ({ ...d, queries: d.v }))}
        series={[{ key: "queries", label: "Slow Queries", color: "#ef4444" }]}
        title="Query Volume"
        description="Slow queries over time"
        height={250}
      />
    {/if}

    <!-- N+1 Query Suspects -->
    {#if n_plus_one_requests.length > 0}
      <div class="n-plus-one-section">
        <div class="n-plus-one-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <h3 class="n-plus-one-title">N+1 Query Suspects</h3>
        </div>
        <div class="n-plus-one-table">
          <div class="np1-thead">
            <div class="np1-th" style="flex:2">Path</div>
            <div class="np1-th" style="flex:1.5">Controller</div>
            <div class="np1-th np1-th-right" style="width:5rem">Query Count</div>
            <div class="np1-th np1-th-right" style="width:5rem">When</div>
          </div>
          {#each n_plus_one_requests as np (np.path + np.controller_action + np.occurred_at)}
            <div class="np1-row">
              <div class="np1-td" style="flex:2">
                <span class="np1-warning-badge">N+1</span>
                <span class="np1-path">{np.path}</span>
              </div>
              <div class="np1-td" style="flex:1.5"><span class="np1-controller">{np.controller_action || "—"}</span></div>
              <div class="np1-td np1-td-num" style="width:5rem">{np.query_count}</div>
              <div class="np1-td np1-td-num" style="width:5rem"><span class="np1-time">{timeAgo(np.occurred_at)} ago</span></div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Bar Chart -->
    {#if topQueries.length > 0}
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Slowest Query Patterns</h2>
          <span class="card-subtitle">Top 5 by average duration</span>
        </div>
        <div class="card-body">
          <BarList items={topQueries} color="#ef4444" valueFormatter={fmt} maxItems={5} />
        </div>
      </div>
    {/if}

    <!-- Query Patterns Table -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Query Patterns</h2>
        <span class="card-subtitle">{queries.length} unique patterns</span>
      </div>
      <div class="data-table">
        <div class="table-header">
          <div class="th" style="flex:3">Query</div>
          <div class="th th-right" style="width:4rem"><SortableHeader column="total" label="Count" /></div>
          <div class="th th-right" style="width:5rem"><SortableHeader column="avg_duration" label="Avg" /></div>
          <div class="th th-right" style="width:5rem"><SortableHeader column="max_duration" label="Max" /></div>
          <div class="th" style="flex:1">Source</div>
        </div>
        {#each queries as q (q.normalized_sql)}
          <button class="table-row" onclick={() => openQuery(q)}>
            <div class="td td-sql" style="flex:3">
              <span class="sql-text">{q.normalized_sql}</span>
            </div>
            <div class="td td-num" style="width:4rem">{q.total}</div>
            <div class="td td-num" style="width:5rem" class:td-danger={q.avg_duration > 200}>{fmt(q.avg_duration)}</div>
            <div class="td td-num" style="width:5rem" class:td-danger={q.max_duration > 500}>{fmt(q.max_duration)}</div>
            <div class="td td-source" style="flex:1">{q.source_location || "\u2014"}</div>
          </button>
        {/each}
        {#if queries.length === 0}
          <div class="table-empty">
            <svg width="24" height="24" fill="none" stroke="#94a3b8" stroke-width="1.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21v-2a4 4 0 0 1 4-4h1"/><circle cx="17" cy="8" r="4"/></svg>
            <span>No slow queries recorded in this period.</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Slowest Individual Queries -->
    {#if slowest.length > 0}
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Slowest Individual Queries</h2>
          <span class="card-subtitle">Recent worst offenders</span>
        </div>
        <div class="slowest-list">
          {#each slowest as q (q.id)}
            <button class="slowest-item" onclick={() => { sheetItem = q; sheetOpen = true; }}>
              <div class="slowest-left">
                <span class="slowest-duration">{fmt(q.duration_ms)}</span>
                <span class="slowest-source">{q.source_location || "\u2014"}</span>
              </div>
              <div class="slowest-right">
                <span class="slowest-action">{q.controller_action}</span>
                <span class="slowest-time">{timeAgo(q.occurred_at)} ago</span>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</DaylightLayout>

<EwSheet bind:open={sheetOpen} title="Query Detail" aiContext={sheetItem ? `SQL Query (slow):\n${sheetItem.sql || sheetItem.normalized_sql}\n\nDuration: ${fmt(sheetItem.duration_ms || sheetItem.avg_duration)}\nMax: ${fmt(sheetItem.max_duration || sheetItem.duration_ms)}\nSource: ${sheetItem.source_location || "unknown"}\nController: ${sheetItem.controller_action || "N/A"}\nPath: ${sheetItem.request_path || "N/A"}\nOccurrences: ${sheetItem.total || 1}` : ""}>
  {#if sheetItem}
    <div class="sheet-detail">
      <dl class="dl">
        {#if sheetItem.controller_action}<div class="dl-row"><dt>Controller</dt><dd>{sheetItem.controller_action}</dd></div>{/if}
        {#if sheetItem.request_path}<div class="dl-row"><dt>Path</dt><dd class="mono">{sheetItem.request_path}</dd></div>{/if}
        {#if sheetItem.source_location}<div class="dl-row"><dt>Source</dt><dd class="mono">{sheetItem.source_location}</dd></div>{/if}
        <div class="dl-row"><dt>Duration</dt><dd class:td-danger={sheetItem.duration_ms > 200 || sheetItem.avg_duration > 200}>{fmt(sheetItem.duration_ms || sheetItem.avg_duration)}</dd></div>
        {#if sheetItem.max_duration}<div class="dl-row"><dt>Max</dt><dd class:td-danger={sheetItem.max_duration > 500}>{fmt(sheetItem.max_duration)}</dd></div>{/if}
        {#if sheetItem.total}<div class="dl-row"><dt>Occurrences</dt><dd>{sheetItem.total}</dd></div>{/if}
      </dl>

      <h4 class="sheet-sub">SQL</h4>
      <pre class="sheet-sql">{sheetItem.sql || sheetItem.normalized_sql}</pre>
    </div>
  {/if}
</EwSheet>

<style>
  /* Page Layout */
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.025em;
  }

  .page-subtitle {
    font-size: 0.8125rem;
    color: #64748b;
    margin: 0.25rem 0 0;
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  /* Stat Cards */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  .stat-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .stat-card-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #64748b;
  }

  .stat-card-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.02em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .stat-card-value.danger {
    color: #ef4444;
  }

  /* Cards */
  .card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .card-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .card-title {
    font-size: 0.9375rem;
    font-weight: 650;
    color: #0f172a;
    margin: 0;
  }

  .card-subtitle {
    font-size: 0.75rem;
    color: #64748b;
  }

  .card-body {
    padding: 1.25rem;
  }

  /* Data Table */
  .data-table {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .card .data-table {
    border: none;
    border-radius: 0;
  }

  .table-header {
    display: flex;
    align-items: center;
    padding: 0 1rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .th {
    padding: 0.625rem 0.5rem;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
  }

  .th-right {
    text-align: right;
  }

  .table-row {
    display: flex;
    align-items: center;
    padding: 0 1rem;
    width: 100%;
    border: none;
    border-bottom: 1px solid #f1f5f9;
    background: none;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s ease;
  }

  .table-row:last-child {
    border-bottom: none;
  }

  .table-row:hover {
    background: #f8fafc;
  }

  .td {
    padding: 0.625rem 0.5rem;
    font-size: 0.8125rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #0f172a;
  }

  .td-sql {
    min-width: 0;
  }

  .sql-text {
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
    font-size: 0.75rem;
    color: #334155;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  .td-num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    color: #334155;
  }

  .td-danger {
    color: #ef4444;
    font-weight: 600;
  }

  .td-source {
    font-size: 0.75rem;
    color: #64748b;
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
  }

  .table-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2.5rem 1rem;
    color: #94a3b8;
    font-size: 0.8125rem;
  }

  /* Slowest Individual Queries */
  .slowest-list {
    display: flex;
    flex-direction: column;
  }

  .slowest-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.25rem;
    border: none;
    border-bottom: 1px solid #f1f5f9;
    background: none;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: background 0.1s ease;
    gap: 1rem;
  }

  .slowest-item:last-child {
    border-bottom: none;
  }

  .slowest-item:hover {
    background: #f8fafc;
  }

  .slowest-left {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    min-width: 0;
    flex: 1;
  }

  .slowest-duration {
    font-size: 0.875rem;
    font-weight: 700;
    color: #ef4444;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
    min-width: 3.5rem;
  }

  .slowest-source {
    font-size: 0.75rem;
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
    color: #334155;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .slowest-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .slowest-action {
    font-size: 0.75rem;
    color: #64748b;
    background: #f1f5f9;
    padding: 0.125rem 0.5rem;
    border-radius: 0.375rem;
  }

  .slowest-time {
    font-size: 0.6875rem;
    color: #94a3b8;
    flex-shrink: 0;
    min-width: 2.5rem;
    text-align: right;
  }

  /* Sheet Detail */
  .sheet-detail {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .dl {
    display: flex;
    flex-direction: column;
    margin: 0;
  }

  .dl-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f1f5f9;
    font-size: 0.8125rem;
  }

  .dl-row:last-child {
    border-bottom: none;
  }

  .dl-row dt {
    color: #64748b;
    font-weight: 500;
  }

  .dl-row dd {
    color: #0f172a;
    font-weight: 500;
    margin: 0;
  }

  .mono {
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
    font-size: 0.75rem;
  }

  .sheet-sub {
    font-size: 0.6875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .sheet-sql {
    font-size: 0.75rem;
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
    background: #f8fafc;
    padding: 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    line-height: 1.6;
    color: #334155;
  }

  /* Chart section */
  .chart-section {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.25rem;
  }

  /* N+1 Section */
  .n-plus-one-section {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 0.75rem;
    overflow: hidden;
  }
  .n-plus-one-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid #fde68a;
  }
  .n-plus-one-title {
    font-size: 0.9375rem;
    font-weight: 650;
    color: #92400e;
    margin: 0;
  }
  .n-plus-one-table {
    background: #fff;
  }
  .np1-thead {
    display: flex;
    align-items: center;
    padding: 0 1rem;
    background: #fefce8;
    border-bottom: 1px solid #fde68a;
  }
  .np1-th {
    padding: 0.5rem 0.5rem;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #92400e;
  }
  .np1-th-right { text-align: right; }
  .np1-row {
    display: flex;
    align-items: center;
    padding: 0 1rem;
    border-bottom: 1px solid #fef3c7;
    transition: background 0.1s;
  }
  .np1-row:last-child { border-bottom: none; }
  .np1-row:hover { background: #fefce8; }
  .np1-td {
    padding: 0.5rem 0.5rem;
    font-size: 0.8125rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #334155;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .np1-td-num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    justify-content: flex-end;
  }
  .np1-warning-badge {
    display: inline-flex;
    align-items: center;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    padding: 0.125rem 0.4375rem;
    border-radius: 9999px;
    background: #fef3c7;
    color: #d97706;
    flex-shrink: 0;
  }
  .np1-path {
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
    font-size: 0.75rem;
    color: #334155;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .np1-controller { font-size: 0.8125rem; color: #64748b; }
  .np1-time { font-size: 0.75rem; color: #94a3b8; }

  /* Responsive */
  @media (max-width: 640px) {
    .stat-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>

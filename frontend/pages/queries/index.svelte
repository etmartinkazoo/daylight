<script>
  import { router } from "@inertiajs/svelte";
  import { fmt, timeAgo } from "@/lib/formatters.js";
  import DaylightLayout from "../DaylightLayout.svelte";
  import Badge from "@/components/ui/Badge.svelte";
  import Button from "@/components/ui/Button.svelte";
  import Table from "@/components/ui/Table.svelte";
  import SortableHeader from "@/components/ui/SortableHeader.svelte";
  import PeriodSelect from "../PeriodSelect.svelte";
  import EwSheet from "../errors/EwSheet.svelte";
  import BarList from "@/components/charts/BarList.svelte";
  import TimeSeriesChart from "@/components/charts/TimeSeriesChart.svelte";
  import InteractiveBarChart from "@/components/charts/InteractiveBarChart.svelte";
  import ExportButton from "@/components/ui/ExportButton.svelte";
  import InfiniteScroll from "@/components/ui/InfiniteScroll.svelte";

  let { queries = [], slowest = [], period = "24h", total_queries = 0, volume_series = [], n_plus_one_requests = [], page = 1, has_more = false, base_path: base = "/daylight", sort_column = null, sort_direction = null } = $props();

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
  function openQuery(q) { sheetItem = q; sheetOpen = true; }

  let allQueries = $state(queries);
  let currentPage = $state(page);
  let loadingMore = $state(false);

  $effect(() => {
    period;
    allQueries = queries;
    currentPage = page;
  });

  function loadMore() {
    if (loadingMore || !has_more) return;
    loadingMore = true;
    router.get(`${base}/queries`, { period, page: currentPage + 1 }, {
      preserveState: true,
      preserveScroll: true,
      only: ['queries', 'page', 'has_more'],
      onSuccess: (p) => {
        const newQueries = p.props.queries || [];
        allQueries = [...allQueries, ...newQueries];
        currentPage = p.props.page;
        has_more = p.props.has_more;
        loadingMore = false;
      },
      onError: () => { loadingMore = false; }
    });
  }
</script>

<svelte:head><title>Queries — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="dl-page">
    <div class="dl-page-header">
      <div>
        <h1 class="dl-page-title">Slow Queries</h1>
        <p class="dl-page-subtitle">Queries exceeding 50ms threshold in the last {period}</p>
      </div>
      <div class="header-controls">
        <ExportButton baseUrl={`${base}/queries/export`} />
        <PeriodSelect value={period} onchange={changePeriod} />
      </div>
    </div>

    <div class="dl-stat-grid">
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

    {#if volume_series.length > 0}
      <InteractiveBarChart
        data={volume_series.map(d => ({ ...d, queries: d.v }))}
        series={[{ key: "queries", label: "Slow Queries", color: "#ef4444" }]}
        title="Query Volume"
        description="Slow queries over time"
        height={250}
      />
    {/if}

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
          {#each n_plus_one_requests as np, i (np.path + ':' + i)}
            <div class="np1-row">
              <div class="np1-td" style="flex:2">
                <span class="np1-warning-badge">N+1</span>
                <span class="np1-path">{np.path}</span>
              </div>
              <div class="np1-td" style="flex:1.5"><span class="np1-controller">{np.controller_action || "—"}</span></div>
              <div class="np1-td np1-td-num" style="width:5rem">{np.query_count}</div>
              <div class="np1-td np1-td-num" style="width:5rem"><span class="np1-time">{timeAgo(np.occurred_at)}</span></div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if topQueries.length > 0}
      <div class="dl-card">
        <div class="dl-card-header">
          <h2 class="dl-card-title">Slowest Query Patterns</h2>
          <span class="dl-card-subtitle">Top 5 by average duration</span>
        </div>
        <div class="dl-card-body">
          <BarList items={topQueries} color="#ef4444" valueFormatter={fmt} maxItems={5} />
        </div>
      </div>
    {/if}

    <div class="dl-card">
      <div class="dl-card-header">
        <h2 class="dl-card-title">Query Patterns</h2>
        <span class="dl-card-subtitle">{queries.length} unique patterns</span>
      </div>
      <div class="dl-data-table">
        <div class="dl-table-header">
          <div class="dl-th" style="flex:3">Query</div>
          <div class="dl-th dl-th-right" style="width:4rem"><SortableHeader column="total" label="Count" {sort_column} {sort_direction} /></div>
          <div class="dl-th dl-th-right" style="width:5rem"><SortableHeader column="avg_duration" label="Avg" {sort_column} {sort_direction} /></div>
          <div class="dl-th dl-th-right" style="width:5rem"><SortableHeader column="max_duration" label="Max" {sort_column} {sort_direction} /></div>
          <div class="dl-th" style="flex:1">Source</div>
        </div>
        {#each allQueries as q, i (q.normalized_sql + ':' + i)}
          <button class="dl-table-row" onclick={() => openQuery(q)}>
            <div class="dl-td td-sql" style="flex:3">
              <span class="sql-text">{q.normalized_sql}</span>
            </div>
            <div class="dl-td dl-td-num" style="width:4rem">{q.total}</div>
            <div class="dl-td dl-td-num" style="width:5rem" class:td-danger={q.avg_duration > 200}>{fmt(q.avg_duration)}</div>
            <div class="dl-td dl-td-num" style="width:5rem" class:td-danger={q.max_duration > 500}>{fmt(q.max_duration)}</div>
            <div class="dl-td td-source" style="flex:1">{q.source_location || "\u2014"}</div>
          </button>
        {/each}
        {#if allQueries.length === 0}
          <div class="dl-table-empty">
            <svg width="24" height="24" fill="none" stroke="#94a3b8" stroke-width="1.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21v-2a4 4 0 0 1 4-4h1"/><circle cx="17" cy="8" r="4"/></svg>
            <span>No slow queries recorded in this period.</span>
          </div>
        {/if}
        <InfiniteScroll loading={loadingMore} hasMore={has_more} onLoadMore={loadMore} />
      </div>
    </div>

    {#if slowest.length > 0}
      <div class="dl-card">
        <div class="dl-card-header">
          <h2 class="dl-card-title">Slowest Individual Queries</h2>
          <span class="dl-card-subtitle">Recent worst offenders</span>
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
                <span class="slowest-time">{timeAgo(q.occurred_at)}</span>
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
    <div class="dl-sheet-detail">
      <dl class="dl-dl">
        {#if sheetItem.controller_action}<div class="dl-dl-row"><dt>Controller</dt><dd>{sheetItem.controller_action}</dd></div>{/if}
        {#if sheetItem.request_path}<div class="dl-dl-row"><dt>Path</dt><dd class="dl-mono">{sheetItem.request_path}</dd></div>{/if}
        {#if sheetItem.source_location}<div class="dl-dl-row"><dt>Source</dt><dd class="dl-mono">{sheetItem.source_location}</dd></div>{/if}
        <div class="dl-dl-row"><dt>Duration</dt><dd class:td-danger={sheetItem.duration_ms > 200 || sheetItem.avg_duration > 200}>{fmt(sheetItem.duration_ms || sheetItem.avg_duration)}</dd></div>
        {#if sheetItem.max_duration}<div class="dl-dl-row"><dt>Max</dt><dd class:td-danger={sheetItem.max_duration > 500}>{fmt(sheetItem.max_duration)}</dd></div>{/if}
        {#if sheetItem.total}<div class="dl-dl-row"><dt>Occurrences</dt><dd>{sheetItem.total}</dd></div>{/if}
      </dl>

      <h4 class="sheet-sub">SQL</h4>
      <pre class="sheet-sql">{sheetItem.sql || sheetItem.normalized_sql}</pre>
    </div>
  {/if}
</EwSheet>

<style>
  .header-controls { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

  .stat-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
  .stat-card-label { font-size: 0.8125rem; font-weight: 500; color: var(--color-muted); }
  .stat-card-value { font-size: 1.75rem; font-weight: 700; color: var(--color-fg); letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; }
  .stat-card-value.danger { color: var(--color-danger); }

  .td-sql { min-width: 0; }
  .sql-text { font-family: "SF Mono", Monaco, Menlo, Consolas, monospace; font-size: 0.75rem; color: var(--color-fg-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
  .td-danger { color: var(--color-danger); font-weight: 600; }
  .td-source { font-size: 0.75rem; color: var(--color-muted); font-family: "SF Mono", Monaco, Menlo, Consolas, monospace; }

  .slowest-list { display: flex; flex-direction: column; }
  .slowest-item { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.25rem; border: none; border-bottom: 1px solid var(--color-accent); background: none; font-family: inherit; cursor: pointer; text-align: left; width: 100%; transition: background 0.1s ease; gap: 1rem; }
  .slowest-item:last-child { border-bottom: none; }
  .slowest-item:hover { background: var(--color-surface); }
  .slowest-left { display: flex; align-items: center; gap: 0.875rem; min-width: 0; flex: 1; }
  .slowest-duration { font-size: 0.875rem; font-weight: 700; color: var(--color-danger); font-variant-numeric: tabular-nums; flex-shrink: 0; min-width: 3.5rem; }
  .slowest-source { font-size: 0.75rem; font-family: "SF Mono", Monaco, Menlo, Consolas, monospace; color: var(--color-fg-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .slowest-right { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
  .slowest-action { font-size: 0.75rem; color: var(--color-muted); background: var(--color-accent); padding: 0.125rem 0.5rem; border-radius: 0.375rem; }
  .slowest-time { font-size: 0.6875rem; color: var(--color-muted-light); flex-shrink: 0; min-width: 2.5rem; text-align: right; }

  .sheet-sub { font-size: 0.6875rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
  .sheet-sql { font-size: 0.75rem; font-family: "SF Mono", Monaco, Menlo, Consolas, monospace; background: var(--color-surface); padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.5rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.6; color: var(--color-fg-tertiary); }

  .n-plus-one-section { background: var(--color-warning-subtle); border: 1px solid var(--color-warning-border); border-radius: 0.75rem; overflow: hidden; }
  .n-plus-one-header { display: flex; align-items: center; gap: 0.5rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--color-warning-border); }
  .n-plus-one-title { font-size: 0.9375rem; font-weight: 650; color: var(--color-warning-darker); margin: 0; }
  .n-plus-one-table { background: var(--color-bg); }
  .np1-thead { display: flex; align-items: center; padding: 0 1rem; background: var(--color-warning-subtle); border-bottom: 1px solid var(--color-warning-border); }
  .np1-th { padding: 0.5rem; font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-warning-darker); }
  .np1-th-right { text-align: right; }
  .np1-row { display: flex; align-items: center; padding: 0 1rem; border-bottom: 1px solid var(--color-warning-bg); transition: background 0.1s; }
  .np1-row:last-child { border-bottom: none; }
  .np1-row:hover { background: var(--color-warning-subtle); }
  .np1-td { padding: 0.5rem; font-size: 0.8125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-fg-tertiary); display: flex; align-items: center; gap: 0.5rem; }
  .np1-td-num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; justify-content: flex-end; }
  .np1-warning-badge { display: inline-flex; align-items: center; font-size: 0.625rem; font-weight: 700; letter-spacing: 0.03em; padding: 0.125rem 0.4375rem; border-radius: 9999px; background: var(--color-warning-bg); color: var(--color-warning-dark); flex-shrink: 0; }
  .np1-path { font-family: "SF Mono", Monaco, Menlo, Consolas, monospace; font-size: 0.75rem; color: var(--color-fg-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .np1-controller { font-size: 0.8125rem; color: var(--color-muted); }
  .np1-time { font-size: 0.75rem; color: var(--color-muted-light); }
</style>

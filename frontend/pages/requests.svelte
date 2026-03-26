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
  import Sparkline from "@/components/charts/Sparkline.svelte";
  import TimeSeriesChart from "@/components/charts/TimeSeriesChart.svelte";
  import InteractiveBarChart from "@/components/charts/InteractiveBarChart.svelte";
  import AutoRefresh from "@/components/ui/AutoRefresh.svelte";
  import ExportButton from "@/components/ui/ExportButton.svelte";
  import InfiniteScroll from "@/components/ui/InfiniteScroll.svelte";

  let {
    endpoints = [], route_requests = [], selected_request = null,
    selected_route = null, period = "24h", total_requests = 0,
    throughput_rpm = 0, apdex = null, latency_series = [], throughput_series = [], deploys = [],
    page = 1, has_more = false
  } = $props();
  const pageStore = usePage();
  let base = $derived($pageStore.props?.base_path || "/daylight");

  let sheetOpen = $state(false);
  let sheetItem = $state(null);
  let sheetType = $state("endpoint");
  let refreshInterval = $state(0);

  $effect(() => {
    if (refreshInterval <= 0) return;
    const id = setInterval(() => {
      router.reload({ preserveState: true, preserveScroll: true });
    }, refreshInterval);
    return () => clearInterval(id);
  });

  let apdexColor = $derived(apdex == null ? "#64748b" : apdex >= 0.9 ? "#22c55e" : apdex >= 0.7 ? "#f59e0b" : "#ef4444");

  function changePeriod(p) { router.get(`${base}/requests`, { period: p }, { preserveState: true }); }
  function fmt(ms) { if (ms == null) return "—"; return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`; }
  function timeAgo(d) { if (!d) return ""; const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`; }
  function formatTime(d) { if (!d) return ""; return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  function sc(c) { return c >= 500 ? "s5xx" : c >= 400 ? "s4xx" : "s2xx"; }
  function methodColor(m) { if (m === "GET") return "#16a34a"; if (m === "POST") return "#2563eb"; if (m === "PATCH" || m === "PUT") return "#d97706"; if (m === "DELETE") return "#dc2626"; return "#6b7280"; }

  // Drill-down: click endpoint → load individual requests
  function selectEndpoint(ep) {
    router.get(`${base}/requests`, { period, route: ep.route }, { preserveState: true });
  }

  function goBack() {
    router.get(`${base}/requests`, { period }, { preserveState: true });
  }

  // Click individual request → open sheet with timeline
  function openRequest(req) {
    sheetItem = req;
    sheetType = "request";
    sheetOpen = true;
    // Load queries for this request
    if (!req.queries) {
      router.get(`${base}/requests`, { period, route: selected_route, request_id: req.id }, {
        preserveState: true,
        only: ["selected_request"],
        onSuccess: (page) => {
          if (page.props.selected_request) sheetItem = page.props.selected_request;
        }
      });
    }
  }

  function openEndpointSheet(ep) {
    sheetItem = ep;
    sheetType = "endpoint";
    sheetOpen = true;
  }

  let sheetTitle = $derived(
    sheetType === "request" ? `${sheetItem?.method} ${sheetItem?.path}` : (sheetItem?.route || "")
  );

  let sheetAi = $derived.by(() => {
    if (!sheetItem) return "";
    if (sheetType === "endpoint") return `Route: ${sheetItem.route}\nRequests: ${sheetItem.total}\nAvg: ${fmt(sheetItem.avg_duration)}\nP95: ${fmt(sheetItem.p95_duration)}\nMax: ${fmt(sheetItem.max_duration)}\n2xx: ${sheetItem.ok_count}, 4xx: ${sheetItem.client_error_count}, 5xx: ${sheetItem.server_error_count}`;
    let ctx = `Request: ${sheetItem.method} ${sheetItem.path}\nStatus: ${sheetItem.status_code}\nDuration: ${fmt(sheetItem.duration_ms)}\nDB: ${fmt(sheetItem.db_duration_ms)}\nQueries: ${sheetItem.query_count}`;
    if (sheetItem.queries?.length) ctx += `\n\nSlow queries during this request:\n${sheetItem.queries.map(q => `${fmt(q.duration_ms)} ${q.sql}`).join("\n")}`;
    return ctx;
  });

  // Derived stats
  let statTotal = $derived(endpoints.reduce((s, ep) => s + (ep.total || 0), 0));
  let statAvg = $derived.by(() => {
    const totalReqs = endpoints.reduce((s, ep) => s + (ep.total || 0), 0);
    if (totalReqs === 0) return 0;
    const weighted = endpoints.reduce((s, ep) => s + (ep.avg_duration || 0) * (ep.total || 0), 0);
    return weighted / totalReqs;
  });
  let statErrors = $derived(endpoints.reduce((s, ep) => s + (ep.server_error_count || 0), 0));
  let statErrorRate = $derived(statTotal > 0 ? ((statErrors / statTotal) * 100).toFixed(1) : "0.0");
  let statP95 = $derived(endpoints.length > 0 ? Math.max(...endpoints.map(ep => ep.p95_duration || 0)) : 0);

  let allEndpoints = $state(endpoints);
  let allRouteRequests = $state(route_requests);
  let currentPage = $state(page);
  let loadingMore = $state(false);

  $effect(() => {
    period;
    if (!selected_route) {
      allEndpoints = endpoints;
      currentPage = page;
    }
  });

  $effect(() => {
    selected_route;
    if (selected_route) {
      allRouteRequests = route_requests;
      currentPage = page;
    }
  });

  function loadMore() {
    if (loadingMore || !has_more) return;
    loadingMore = true;
    const params = selected_route
      ? { period, route: selected_route, page: currentPage + 1 }
      : { period, page: currentPage + 1 };
    const onlyProps = selected_route
      ? ['route_requests', 'page', 'has_more']
      : ['endpoints', 'page', 'has_more'];
    router.get(`${base}/requests`, params, {
      preserveState: true,
      preserveScroll: true,
      only: onlyProps,
      onSuccess: (p) => {
        if (selected_route) {
          const newItems = p.props.route_requests || [];
          allRouteRequests = [...allRouteRequests, ...newItems];
        } else {
          const newItems = p.props.endpoints || [];
          allEndpoints = [...allEndpoints, ...newItems];
        }
        currentPage = p.props.page;
        has_more = p.props.has_more;
        loadingMore = false;
      },
      onError: () => { loadingMore = false; }
    });
  }

  let topEndpoints = $derived(
    endpoints.slice().sort((a, b) => b.avg_duration - a.avg_duration).slice(0, 5).map(ep => ({
      label: ep.route?.replace(/^(GET|POST|PATCH|PUT|DELETE)\s/, "") || ep.route,
      value: ep.avg_duration,
    }))
  );
</script>

<svelte:head><title>Requests — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Requests</h1>
        <p class="page-sub">{total_requests.toLocaleString()} requests in the last {period}</p>
      </div>
      <div class="header-controls">
        <AutoRefresh bind:interval={refreshInterval} />
        <ExportButton baseUrl={`${base}/requests/export`} />
        <PeriodSelect value={period} onchange={changePeriod} />
      </div>
    </div>

    {#if selected_route && allRouteRequests.length > 0}
      <!-- Level 2: Individual requests for a route -->
      <button class="back-btn" onclick={goBack}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        All endpoints
      </button>
      <div class="drilldown-header">
        <h2 class="route-title">{selected_route}</h2>
        <span class="drilldown-count">{allRouteRequests.length} requests</span>
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th class="th" style="width:4.5rem">Status</th>
              <th class="th" style="width:auto">Path</th>
              <th class="th r" style="width:5.5rem">Duration</th>
              <th class="th r" style="width:4.5rem">DB</th>
              <th class="th r" style="width:3.5rem">Qry</th>
              <th class="th" style="width:5rem">IP</th>
              <th class="th r" style="width:4.5rem">When</th>
            </tr>
          </thead>
          <tbody>
            {#each allRouteRequests as req (req.id)}
              <tr class="row" onclick={() => openRequest(req)}>
                <td class="cell"><span class="status-badge {sc(req.status_code)}">{req.status_code}</span></td>
                <td class="cell mono-cell">{req.path}</td>
                <td class="cell num" class:slow={req.duration_ms > 500}>{fmt(req.duration_ms)}</td>
                <td class="cell num">{fmt(req.db_duration_ms)}</td>
                <td class="cell num">{req.query_count}</td>
                <td class="cell"><span class="ip-text">{req.ip}</span></td>
                <td class="cell r"><span class="time-ago">{timeAgo(req.occurred_at)}</span></td>
              </tr>
            {/each}
          </tbody>
        </table>
        <InfiniteScroll loading={loadingMore} hasMore={has_more} onLoadMore={loadMore} />
      </div>

    {:else}
      <!-- Stat cards + bar chart -->
      <div class="stats-row">
        <div class="stats-grid stats-grid-3col">
          <div class="stat-card">
            <span class="stat-card-label">Total Requests</span>
            <span class="stat-card-value">{statTotal.toLocaleString()}</span>
          </div>
          <div class="stat-card">
            <span class="stat-card-label">Avg Response Time</span>
            <span class="stat-card-value">{fmt(statAvg)}</span>
          </div>
          <div class="stat-card">
            <span class="stat-card-label">Error Rate (5xx)</span>
            <span class="stat-card-value" class:stat-danger={statErrors > 0}>{statErrorRate}%</span>
          </div>
          <div class="stat-card">
            <span class="stat-card-label">P95 Response Time</span>
            <span class="stat-card-value" class:stat-warn={statP95 > 500}>{fmt(statP95)}</span>
          </div>
          <div class="stat-card">
            <span class="stat-card-label">Throughput</span>
            <span class="stat-card-value">{throughput_rpm}<span class="stat-unit"> req/min</span></span>
          </div>
          {#if apdex != null}
            <div class="stat-card">
              <span class="stat-card-label">Apdex</span>
              <span class="stat-card-value" style="color: {apdexColor}">{apdex.toFixed(2)}</span>
            </div>
          {/if}
        </div>
        <div class="chart-card">
          <h3 class="chart-title">Slowest Endpoints</h3>
          <BarList items={topEndpoints} valueFormatter={fmt} color="#6366f1" />
        </div>
      </div>

      <!-- Request Performance Chart -->
      {#if latency_series.length > 0 || throughput_series.length > 0}
        {@const chartData = latency_series.map((d, i) => ({
          t: d.t,
          latency: d.v,
          throughput: throughput_series[i]?.v || 0,
        }))}
        <InteractiveBarChart
          data={chartData}
          series={[
            { key: "latency", label: "Avg Latency (ms)", color: "#6366f1" },
            { key: "throughput", label: "Throughput (req)", color: "#3b82f6" },
          ]}
          title="Request Performance"
          description="Response time and throughput over time"
          height={250}
          valueFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}`}
        />
      {/if}

      <!-- Level 1: Endpoints table -->
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th class="th" style="width:auto">Route</th>
              <th class="th r" style="width:4rem"><SortableHeader column="total" label="Reqs" /></th>
              <th class="th r" style="width:5rem"><SortableHeader column="avg_duration" label="Avg" /></th>
              <th class="th r" style="width:5rem">P95</th>
              <th class="th r" style="width:5rem"><SortableHeader column="max_duration" label="Max" /></th>
              <th class="th c" style="width:3.5rem"><SortableHeader column="ok_count" label="2xx" /></th>
              <th class="th c" style="width:3.5rem"><SortableHeader column="client_error_count" label="4xx" /></th>
              <th class="th c" style="width:3.5rem"><SortableHeader column="server_error_count" label="5xx" /></th>
            </tr>
          </thead>
          <tbody>
            {#each allEndpoints as ep, i (ep.route + ':' + i)}
              <tr class="row" onclick={() => selectEndpoint(ep)}>
                <td class="cell">
                  <span class="method-pill" style="background: {methodColor(ep.method)}15; color: {methodColor(ep.method)}">{ep.method}</span>
                  <span class="route-path">{ep.route?.replace(/^(GET|POST|PATCH|PUT|DELETE)\s/, "") || ep.route}</span>
                </td>
                <td class="cell num">{ep.total}</td>
                <td class="cell num">{fmt(ep.avg_duration)}</td>
                <td class="cell num" class:warn={ep.p95_duration > 500}>{fmt(ep.p95_duration)}</td>
                <td class="cell num" class:slow={ep.max_duration > 1000}>{fmt(ep.max_duration)}</td>
                <td class="cell num c">{ep.ok_count}</td>
                <td class="cell num c" class:warn={ep.client_error_count > 0}>{ep.client_error_count}</td>
                <td class="cell num c" class:err={ep.server_error_count > 0}>{ep.server_error_count}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if allEndpoints.length === 0}
          <div class="empty-state">
            <p class="empty-text">No request data yet</p>
            <p class="empty-hint">Requests are tracked automatically once your app starts serving traffic.</p>
          </div>
        {/if}
        <InfiniteScroll loading={loadingMore} hasMore={has_more} onLoadMore={loadMore} />
      </div>
    {/if}
  </div>
</DaylightLayout>

<EwSheet bind:open={sheetOpen} title={sheetTitle} aiContext={sheetAi}>
  {#if sheetItem}
    <div class="sheet-detail">
      {#if sheetType === "endpoint"}
        <dl class="dl">
          <div class="dl-row"><dt>Route</dt><dd>{sheetItem.route}</dd></div>
          <div class="dl-row"><dt>Requests</dt><dd>{sheetItem.total}</dd></div>
          <div class="dl-row"><dt>Avg Duration</dt><dd>{fmt(sheetItem.avg_duration)}</dd></div>
          <div class="dl-row"><dt>P95 Duration</dt><dd class:warn={sheetItem.p95_duration > 500}>{fmt(sheetItem.p95_duration)}</dd></div>
          <div class="dl-row"><dt>Max Duration</dt><dd class:slow={sheetItem.max_duration > 1000}>{fmt(sheetItem.max_duration)}</dd></div>
          <div class="dl-row"><dt>Avg DB</dt><dd>{fmt(sheetItem.avg_db_duration)}</dd></div>
          <div class="dl-row"><dt>Avg Queries</dt><dd>{Math.round(sheetItem.avg_query_count)}</dd></div>
          <div class="dl-row"><dt>2xx</dt><dd>{sheetItem.ok_count}</dd></div>
          <div class="dl-row"><dt>4xx</dt><dd class:warn={sheetItem.client_error_count > 0}>{sheetItem.client_error_count}</dd></div>
          <div class="dl-row"><dt>5xx</dt><dd class:err={sheetItem.server_error_count > 0}>{sheetItem.server_error_count}</dd></div>
        </dl>
      {:else}
        <dl class="dl">
          <div class="dl-row"><dt>Method</dt><dd><span class="method-pill" style="background: {methodColor(sheetItem.method)}15; color: {methodColor(sheetItem.method)}">{sheetItem.method}</span></dd></div>
          <div class="dl-row"><dt>Path</dt><dd class="mono-dd">{sheetItem.path}</dd></div>
          <div class="dl-row"><dt>Controller</dt><dd>{sheetItem.controller_action}</dd></div>
          <div class="dl-row"><dt>Status</dt><dd><span class="status-badge {sc(sheetItem.status_code)}">{sheetItem.status_code}</span></dd></div>
          <div class="dl-row"><dt>Duration</dt><dd class:slow={sheetItem.duration_ms > 500}>{fmt(sheetItem.duration_ms)}</dd></div>
          <div class="dl-row"><dt>DB Time</dt><dd>{fmt(sheetItem.db_duration_ms)}</dd></div>
          <div class="dl-row"><dt>View Time</dt><dd>{fmt(sheetItem.view_duration_ms)}</dd></div>
          <div class="dl-row"><dt>Queries</dt><dd>{sheetItem.query_count}</dd></div>
          <div class="dl-row"><dt>IP</dt><dd>{sheetItem.ip}</dd></div>
          <div class="dl-row"><dt>Time</dt><dd>{formatTime(sheetItem.occurred_at)}</dd></div>
        </dl>

        <!-- Waterfall Timeline -->
        {#if sheetItem.waterfall?.length > 0}
          <h4 class="sheet-sub">Request Timeline ({sheetItem.waterfall.length} events)</h4>
          <div class="waterfall">
            {#each sheetItem.waterfall as evt, i}
              <div class="wf-item">
                <div class="wf-type-badge wf-type-{evt.type}">{evt.type}</div>
                <div class="wf-detail">
                  <span class="wf-text">{evt.detail}</span>
                  {#if evt.duration_ms}
                    <span class="wf-duration" class:wf-slow={evt.duration_ms > 100}>{fmt(evt.duration_ms)}</span>
                  {/if}
                </div>
                {#if evt.status_code}
                  <span class="status-badge {sc(evt.status_code)}">{evt.status_code}</span>
                {/if}
                {#if evt.type === "cache"}
                  <span class="wf-cache-badge" class:hit={evt.hit} class:miss={!evt.hit}>{evt.hit ? "HIT" : "MISS"}</span>
                {/if}
                {#if evt.type === "log"}
                  <span class="wf-log-level wf-level-{evt.level}">{evt.level}</span>
                {/if}
              </div>
            {/each}
          </div>
        {:else if sheetItem.queries?.length > 0}
          <!-- Fallback: query timeline -->
          <h4 class="sheet-sub">Query Timeline ({sheetItem.queries.length})</h4>
          <div class="timeline">
            {#each sheetItem.queries as q (q.id)}
              <div class="tl-item">
                <div class="tl-bar" style="width: {Math.max(Math.min((q.duration_ms / sheetItem.duration_ms) * 100, 100), 3)}%"></div>
                <div class="tl-info">
                  <span class="tl-duration" class:slow={q.duration_ms > 100}>{fmt(q.duration_ms)}</span>
                  <span class="tl-source">{q.source_location || ""}</span>
                </div>
                <pre class="tl-sql">{q.sql}</pre>
              </div>
            {/each}
          </div>
        {:else if sheetItem.query_count > 0}
          <p class="sheet-hint">{sheetItem.query_count} queries ran but none exceeded the slow threshold.</p>
        {/if}
      {/if}
    </div>
  {/if}
</EwSheet>

<style>
  /* Page layout */
  .page { display: flex; flex-direction: column; gap: 1.5rem; }
  .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .page-title { font-size: 1.375rem; font-weight: 700; color: var(--color-fg); margin: 0; letter-spacing: -0.01em; }
  .page-sub { font-size: 0.8125rem; color: var(--color-muted); margin: 0.25rem 0 0; }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Stat cards + chart row */
  .stats-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .stat-card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .stat-card-label { font-size: 0.8125rem; font-weight: 500; color: var(--color-muted); }
  .stat-card-value { font-size: 1.75rem; font-weight: 700; color: var(--color-fg); letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; }
  .stat-danger { color: var(--color-danger); }
  .stat-warn { color: var(--color-warning); }

  .chart-card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .chart-title {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-fg);
    margin: 0;
  }

  /* Back button + drilldown */
  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-muted);
    border: none;
    background: none;
    font-family: inherit;
    cursor: pointer;
    padding: 0.25rem 0;
    transition: color 0.15s;
  }
  .back-btn:hover { color: var(--color-fg); }
  .drilldown-header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin-top: -0.5rem;
  }
  .route-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-fg);
    margin: 0;
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
  }
  .drilldown-count {
    font-size: 0.75rem;
    color: var(--color-muted);
    font-weight: 500;
  }

  /* Table */
  .table-container {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }
  .table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .table thead {
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }
  .th {
    padding: 0.625rem 0.75rem;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
    text-align: left;
    white-space: nowrap;
  }
  .th.r { text-align: right; }
  .th.c { text-align: center; }

  .row {
    cursor: pointer;
    border-bottom: 1px solid var(--color-accent);
    transition: background 0.1s;
  }
  .row:last-child { border-bottom: none; }
  .row:hover { background: var(--color-surface); }

  .cell {
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    color: var(--color-fg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }
  .r { text-align: right; }
  .c { text-align: center; }
  .mono-cell {
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
    font-size: 0.75rem;
    color: var(--color-fg-tertiary);
  }

  /* Method pills */
  .method-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    padding: 0.125rem 0.4375rem;
    border-radius: 9999px;
    margin-right: 0.5rem;
    vertical-align: middle;
  }
  .route-path {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-fg);
    vertical-align: middle;
  }

  /* Status badges */
  .status-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6875rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
  }
  .s2xx { background: var(--color-success-bg); color: var(--color-status-2xx); }
  .s4xx { background: var(--color-warning-bg); color: var(--color-status-4xx); }
  .s5xx { background: var(--color-status-5xx-bg); color: var(--color-danger-hover); }

  .ip-text { font-size: 0.6875rem; color: var(--color-muted); font-family: "SF Mono", Monaco, Menlo, Consolas, monospace; }
  .time-ago { font-size: 0.6875rem; color: var(--color-muted); }
  .slow { color: var(--color-danger); font-weight: 600; }
  .warn { color: var(--color-warning); font-weight: 600; }
  .err { color: var(--color-danger); font-weight: 600; }

  /* Empty state */
  .empty-state {
    padding: 3rem 2rem;
    text-align: center;
  }
  .empty-text {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-fg);
    margin: 0 0 0.25rem;
  }
  .empty-hint {
    font-size: 0.8125rem;
    color: var(--color-muted);
    margin: 0;
  }

  /* Sheet styles */
  .sheet-detail { display: flex; flex-direction: column; gap: 1rem; }
  .dl { display: flex; flex-direction: column; margin: 0; }
  .dl-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-accent);
    font-size: 0.8125rem;
  }
  .dl-row:last-child { border-bottom: none; }
  .dl-row dt { color: var(--color-muted); font-weight: 500; }
  .dl-row dd { color: var(--color-fg); font-weight: 500; margin: 0; }
  .mono-dd { font-family: "SF Mono", Monaco, Menlo, Consolas, monospace; font-size: 0.75rem; }

  .sheet-sub {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0.5rem 0 0;
  }
  .sheet-hint { font-size: 0.8125rem; color: var(--color-muted); margin: 0; }

  /* Timeline */
  .timeline { display: flex; flex-direction: column; gap: 0.5rem; }
  .tl-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.625rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
  }
  .tl-bar { height: 4px; background: #6366f1; border-radius: 2px; min-width: 4px; }
  .tl-info { display: flex; align-items: center; gap: 0.5rem; }
  .tl-duration { font-size: 0.75rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--color-fg); }
  .tl-source { font-size: 0.625rem; color: var(--color-muted); font-family: "SF Mono", Monaco, Menlo, Consolas, monospace; }
  .tl-sql {
    font-size: 0.625rem;
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
    color: var(--color-fg-tertiary);
    background: var(--color-surface);
    padding: 0.375rem 0.5rem;
    margin: 0;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.5;
    border-radius: 0.375rem;
  }

  .stats-grid-3col {
    grid-template-columns: repeat(3, 1fr);
  }

  .stat-unit {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-muted);
  }

  .chart-section {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.25rem;
  }

  /* Waterfall Timeline */
  .waterfall {
    display: flex;
    flex-direction: column;
    gap: 0;
    border-left: 2px solid var(--color-border);
    margin-left: 0.25rem;
    padding-left: 0.75rem;
  }
  .wf-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4375rem 0;
    border-bottom: 1px solid var(--color-surface);
  }
  .wf-item:last-child { border-bottom: none; }
  .wf-type-badge {
    font-size: 0.5625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    flex-shrink: 0;
    background: var(--color-accent);
    color: var(--color-muted);
  }
  .wf-type-query { background: var(--color-info-bg); color: var(--color-info-darker); }
  .wf-type-http { background: #ede9fe; color: #7c3aed; }
  .wf-type-cache { background: var(--color-success-bg); color: var(--color-status-2xx); }
  .wf-type-log { background: var(--color-warning-bg); color: var(--color-status-4xx); }
  .wf-type-exception { background: var(--color-status-5xx-bg); color: var(--color-danger-hover); }
  .wf-detail {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }
  .wf-text {
    font-size: 0.75rem;
    color: var(--color-fg-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
  }
  .wf-duration {
    font-size: 0.6875rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--color-fg);
    flex-shrink: 0;
  }
  .wf-slow { color: var(--color-danger); }
  .wf-cache-badge {
    font-size: 0.5625rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 0.0625rem 0.375rem;
    border-radius: 9999px;
    flex-shrink: 0;
  }
  .wf-cache-badge.hit { background: var(--color-success-bg); color: var(--color-status-2xx); }
  .wf-cache-badge.miss { background: var(--color-status-5xx-bg); color: var(--color-danger-hover); }
  .wf-log-level {
    font-size: 0.5625rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 0.0625rem 0.375rem;
    border-radius: 9999px;
    flex-shrink: 0;
    background: var(--color-accent);
    color: var(--color-muted);
  }
  .wf-level-warn { background: var(--color-warning-bg); color: var(--color-status-4xx); }
  .wf-level-error { background: var(--color-status-5xx-bg); color: var(--color-danger-hover); }
  .wf-level-fatal { background: var(--color-status-5xx-bg); color: var(--color-danger-hover); }
  .wf-level-info { background: var(--color-info-bg); color: var(--color-info-darker); }
  .wf-level-debug { background: var(--color-accent); color: var(--color-muted); }
</style>

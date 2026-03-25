<script>
  import { router } from "@inertiajs/svelte";
  import DaylightLayout from "./DaylightLayout.svelte";
  import Badge from "@/components/ui/Badge.svelte";
  import Button from "@/components/ui/Button.svelte";
  import Table from "@/components/ui/Table.svelte";
  import PeriodSelect from "./PeriodSelect.svelte";
  import EwSheet from "./EwSheet.svelte";

  let {
    endpoints = [], route_requests = [], selected_request = null,
    selected_route = null, period = "24h", total_requests = 0
  } = $props();

  let sheetOpen = $state(false);
  let sheetItem = $state(null);
  let sheetType = $state("endpoint");

  function changePeriod(p) { router.get("/daylight/requests", { period: p }, { preserveState: true }); }
  function fmt(ms) { if (ms == null) return "—"; return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`; }
  function timeAgo(d) { if (!d) return ""; const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`; }
  function formatTime(d) { if (!d) return ""; return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
  function sc(c) { return c >= 500 ? "s5xx" : c >= 400 ? "s4xx" : "s2xx"; }
  function methodColor(m) { if (m === "GET") return "#16a34a"; if (m === "POST") return "#2563eb"; if (m === "PATCH" || m === "PUT") return "#d97706"; if (m === "DELETE") return "#dc2626"; return "#6b7280"; }

  // Drill-down: click endpoint → load individual requests
  function selectEndpoint(ep) {
    router.get("/daylight/requests", { period, route: ep.route }, { preserveState: true });
  }

  function goBack() {
    router.get("/daylight/requests", { period }, { preserveState: true });
  }

  // Click individual request → open sheet with timeline
  function openRequest(req) {
    sheetItem = req;
    sheetType = "request";
    sheetOpen = true;
    // Load queries for this request
    if (!req.queries) {
      router.get("/daylight/requests", { period, route: selected_route, request_id: req.id }, {
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
</script>

<svelte:head><title>Requests — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="ew-page">
    <div class="ew-page-header">
      <div>
        <h1 class="ew-page-title">Requests</h1>
        <p class="ew-page-sub">{total_requests.toLocaleString()} requests in the last {period}</p>
      </div>
      <PeriodSelect value={period} onchange={changePeriod} />
    </div>

    {#if selected_route && route_requests.length > 0}
      <!-- Level 2: Individual requests for a route -->
      <button class="back-btn" onclick={goBack}>&larr; All routes</button>
      <h2 class="route-title">{selected_route}</h2>

      <div class="ew-table">
        <div class="ew-thead">
          <div class="ew-th" style="width:3.5rem">Status</div>
          <div class="ew-th" style="flex:2">Path</div>
          <div class="ew-th r" style="width:5rem">Duration</div>
          <div class="ew-th r" style="width:3.5rem">DB</div>
          <div class="ew-th r" style="width:2.5rem">Qry</div>
          <div class="ew-th" style="width:4rem">IP</div>
          <div class="ew-th r" style="width:5rem">When</div>
        </div>
        {#each route_requests as req (req.id)}
          <button class="ew-row ew-row-btn" onclick={() => openRequest(req)}>
            <div class="ew-cell" style="width:3.5rem"><span class="status-badge {sc(req.status_code)}">{req.status_code}</span></div>
            <div class="ew-cell mono" style="flex:2">{req.path}</div>
            <div class="ew-cell num" style="width:5rem" class:slow={req.duration_ms > 500}>{fmt(req.duration_ms)}</div>
            <div class="ew-cell num" style="width:3.5rem">{fmt(req.db_duration_ms)}</div>
            <div class="ew-cell num" style="width:2.5rem">{req.query_count}</div>
            <div class="ew-cell" style="width:4rem"><span class="ip">{req.ip}</span></div>
            <div class="ew-cell r" style="width:5rem"><span class="time-ago">{timeAgo(req.occurred_at)}</span></div>
          </button>
        {/each}
      </div>

    {:else}
      <!-- Level 1: Route list (Nightwatch-style) -->
      <div class="ew-table">
        <div class="ew-thead">
          <div class="ew-th" style="flex:2.5">Route</div>
          <div class="ew-th r" style="width:3.5rem">Reqs</div>
          <div class="ew-th r" style="width:4.5rem">Avg</div>
          <div class="ew-th r" style="width:4.5rem">P95</div>
          <div class="ew-th r" style="width:4.5rem">Max</div>
          <div class="ew-th c" style="width:3rem">2xx</div>
          <div class="ew-th c" style="width:2.5rem">4xx</div>
          <div class="ew-th c" style="width:2.5rem">5xx</div>
        </div>
        {#each endpoints as ep (ep.route)}
          <button class="ew-row ew-row-btn" onclick={() => selectEndpoint(ep)}>
            <div class="ew-cell" style="flex:2.5">
              <span class="method-badge" style="color: {methodColor(ep.method)}">{ep.method}</span>
              <span class="route-path">{ep.route?.replace(/^(GET|POST|PATCH|PUT|DELETE)\s/, "") || ep.route}</span>
            </div>
            <div class="ew-cell num" style="width:3.5rem">{ep.total}</div>
            <div class="ew-cell num" style="width:4.5rem">{fmt(ep.avg_duration)}</div>
            <div class="ew-cell num" style="width:4.5rem" class:warn={ep.p95_duration > 500}>{fmt(ep.p95_duration)}</div>
            <div class="ew-cell num" style="width:4.5rem" class:slow={ep.max_duration > 1000}>{fmt(ep.max_duration)}</div>
            <div class="ew-cell num c" style="width:3rem">{ep.ok_count}</div>
            <div class="ew-cell num c" style="width:2.5rem" class:warn={ep.client_error_count > 0}>{ep.client_error_count}</div>
            <div class="ew-cell num c" style="width:2.5rem" class:err={ep.server_error_count > 0}>{ep.server_error_count}</div>
          </button>
        {/each}
        {#if endpoints.length === 0}
          <div class="ew-empty-row">No request data yet. Requests are tracked automatically.</div>
        {/if}
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
          <div class="dl-row"><dt>Method</dt><dd><span class="method-badge" style="color: {methodColor(sheetItem.method)}">{sheetItem.method}</span></dd></div>
          <div class="dl-row"><dt>Path</dt><dd class="mono">{sheetItem.path}</dd></div>
          <div class="dl-row"><dt>Controller</dt><dd>{sheetItem.controller_action}</dd></div>
          <div class="dl-row"><dt>Status</dt><dd><span class="status-badge {sc(sheetItem.status_code)}">{sheetItem.status_code}</span></dd></div>
          <div class="dl-row"><dt>Duration</dt><dd class:slow={sheetItem.duration_ms > 500}>{fmt(sheetItem.duration_ms)}</dd></div>
          <div class="dl-row"><dt>DB Time</dt><dd>{fmt(sheetItem.db_duration_ms)}</dd></div>
          <div class="dl-row"><dt>View Time</dt><dd>{fmt(sheetItem.view_duration_ms)}</dd></div>
          <div class="dl-row"><dt>Queries</dt><dd>{sheetItem.query_count}</dd></div>
          <div class="dl-row"><dt>IP</dt><dd>{sheetItem.ip}</dd></div>
          <div class="dl-row"><dt>Time</dt><dd>{formatTime(sheetItem.occurred_at)}</dd></div>
        </dl>

        <!-- Request Timeline: queries that ran during this request -->
        {#if sheetItem.queries?.length > 0}
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
  .ew-page { display: flex; flex-direction: column; gap: 1.25rem; }
  .ew-page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .ew-page-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0; }
  .ew-page-sub { font-size: 0.8125rem; color: #6b7280; margin: 0.125rem 0 0; }

  .back-btn { display: inline-flex; align-items: center; font-size: 0.8125rem; color: #6b7280; border: none; background: none; font-family: inherit; cursor: pointer; padding: 0; &:hover { color: #213258; } }
  .route-title { font-size: 0.9375rem; font-weight: 600; color: #213258; margin: -0.5rem 0 0; font-family: "SF Mono", Monaco, Menlo, monospace; }

  .ew-table { background: #fff; border: 1px solid #e5e7eb; overflow: hidden; }
  .ew-thead { display: flex; align-items: center; padding: 0 0.75rem; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .ew-th { padding: 0.5rem 0.375rem; font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
  .r { text-align: right; }
  .c { text-align: center; }
  .ew-row { display: flex; align-items: center; padding: 0 0.75rem; border-bottom: 1px solid #f3f4f6; &:last-child { border-bottom: none; } &:hover { background: #f9fafb; } }
  .ew-row-btn { width: 100%; border: none; background: none; font-family: inherit; cursor: pointer; text-align: left; }
  .ew-cell { padding: 0.4375rem 0.375rem; font-size: 0.8125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ew-empty-row { padding: 2rem; text-align: center; color: #9ca3af; font-size: 0.8125rem; }
  .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
  .mono { font-family: "SF Mono", Monaco, Menlo, monospace; font-size: 0.6875rem; }
  .slow { color: #dc2626; font-weight: 600; }
  .warn { color: #d97706; font-weight: 600; }
  .err { color: #dc2626; font-weight: 600; }
  .method-badge { font-size: 0.625rem; font-weight: 800; letter-spacing: 0.02em; margin-right: 0.375rem; }
  .route-path { font-size: 0.8125rem; font-weight: 500; color: #213258; }
  .status-badge { font-size: 0.6875rem; font-weight: 700; font-variant-numeric: tabular-nums; }
  .s2xx { color: #16a34a; } .s4xx { color: #d97706; } .s5xx { color: #dc2626; }
  .ip { font-size: 0.6875rem; color: #9ca3af; font-family: monospace; }
  .time-ago { font-size: 0.6875rem; color: #9ca3af; }
  .sheet-detail { display: flex; flex-direction: column; gap: 1rem; }
  .dl { display: flex; flex-direction: column; margin: 0; }
  .dl-row { display: flex; justify-content: space-between; padding: 0.4375rem 0; border-bottom: 1px solid #f3f4f6; font-size: 0.8125rem; &:last-child { border-bottom: none; } }
  .dl-row dt { color: #6b7280; font-weight: 500; }
  .dl-row dd { color: #1e293b; font-weight: 500; margin: 0; }
  .sheet-sub { font-size: 0.6875rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; margin: 0; }
  .sheet-hint { font-size: 0.8125rem; color: #6b7280; margin: 0; }
  .timeline { display: flex; flex-direction: column; gap: 0.5rem; }
  .tl-item { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.5rem; border: 1px solid #e5e7eb; }
  .tl-bar { height: 4px; background: #213258; min-width: 4px; }
  .tl-info { display: flex; align-items: center; gap: 0.5rem; }
  .tl-duration { font-size: 0.75rem; font-weight: 700; font-variant-numeric: tabular-nums; color: #374151; }
  .tl-source { font-size: 0.625rem; color: #9ca3af; font-family: monospace; }
  .tl-sql { font-size: 0.625rem; font-family: "SF Mono", Monaco, Menlo, monospace; color: #6b7280; background: #f9fafb; padding: 0.375rem; margin: 0; overflow-x: auto; white-space: pre-wrap; word-break: break-all; line-height: 1.4; }
</style>
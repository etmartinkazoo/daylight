<script>
  import { router, usePage } from "@inertiajs/svelte";
  import DaylightLayout from "./DaylightLayout.svelte";
  import PeriodSelect from "./PeriodSelect.svelte";
  import EwSheet from "./EwSheet.svelte";
  import SortableHeader from "@/components/ui/SortableHeader.svelte";
  import AreaChart from "@/components/charts/AreaChart.svelte";
  import InfiniteScroll from "@/components/ui/InfiniteScroll.svelte";

  let {
    hosts = [], host_requests = [], selected_host = null,
    period = "24h", total_http_requests = 0, volume_series = [],
    page = 1, has_more = false
  } = $props();
  const pageStore = usePage();
  let base = $derived($pageStore.props?.base_path || "/daylight");

  let sheetOpen = $state(false);
  let sheetItem = $state(null);

  function changePeriod(p) { router.get(`${base}/http_requests`, { period: p }, { preserveState: true }); }
  function fmt(ms) { if (ms == null) return "\u2014"; return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`; }
  function timeAgo(d) { if (!d) return ""; const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`; }
  function sc(c) { return c >= 500 ? "s5xx" : c >= 400 ? "s4xx" : "s2xx"; }

  function selectHost(host) {
    router.get(`${base}/http_requests`, { period, host: host.host }, { preserveState: true });
  }

  function goBack() {
    router.get(`${base}/http_requests`, { period }, { preserveState: true });
  }

  function openRequest(req) { sheetItem = req; sheetOpen = true; }

  let sheetAi = $derived.by(() => {
    if (!sheetItem) return "";
    return `Outgoing HTTP Request:\nURL: ${sheetItem.url}\nStatus: ${sheetItem.status_code}\nDuration: ${fmt(sheetItem.duration_ms)}\nMethod: ${sheetItem.method || "GET"}\nTime: ${sheetItem.occurred_at || "N/A"}`;
  });

  let allHosts = $state(hosts);
  let allHostRequests = $state(host_requests);
  let currentPage = $state(page);
  let loadingMore = $state(false);

  $effect(() => {
    period;
    if (!selected_host) {
      allHosts = hosts;
      currentPage = page;
    }
  });

  $effect(() => {
    selected_host;
    if (selected_host) {
      allHostRequests = host_requests;
      currentPage = page;
    }
  });

  function loadMore() {
    if (loadingMore || !has_more) return;
    loadingMore = true;
    const params = selected_host
      ? { period, host: selected_host, page: currentPage + 1 }
      : { period, page: currentPage + 1 };
    const onlyProps = selected_host
      ? ['host_requests', 'page', 'has_more']
      : ['hosts', 'page', 'has_more'];
    router.get(`${base}/http_requests`, params, {
      preserveState: true,
      preserveScroll: true,
      only: onlyProps,
      onSuccess: (p) => {
        if (selected_host) {
          const newItems = p.props.host_requests || [];
          allHostRequests = [...allHostRequests, ...newItems];
        } else {
          const newItems = p.props.hosts || [];
          allHosts = [...allHosts, ...newItems];
        }
        currentPage = p.props.page;
        has_more = p.props.has_more;
        loadingMore = false;
      },
      onError: () => { loadingMore = false; }
    });
  }

  let uniqueHosts = $derived(hosts.length);
  let avgDuration = $derived(hosts.length > 0 ? hosts.reduce((s, h) => s + (h.avg_duration || 0), 0) / hosts.length : 0);
  let totalErrors = $derived(hosts.reduce((s, h) => s + (h.error_count || 0), 0));
  let errorRate = $derived(total_http_requests > 0 ? ((totalErrors / total_http_requests) * 100).toFixed(1) : "0.0");
</script>

<svelte:head><title>Outgoing HTTP — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Outgoing HTTP</h1>
        <p class="page-subtitle">{total_http_requests.toLocaleString()} requests in the last {period}</p>
      </div>
      <div class="period-selector">
        <PeriodSelect value={period} onchange={changePeriod} />
      </div>
    </div>

    {#if selected_host && allHostRequests.length > 0}
      <!-- Level 2: Individual requests for a host -->
      <button class="back-btn" onclick={goBack}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        All hosts
      </button>
      <div class="drilldown-header">
        <h2 class="route-title">{selected_host}</h2>
        <span class="drilldown-count">{allHostRequests.length} requests</span>
      </div>

      <div class="card">
        <div class="data-table">
          <div class="table-header">
            <div class="th" style="width:4.5rem">Status</div>
            <div class="th" style="flex:3">URL</div>
            <div class="th th-right" style="width:5.5rem">Duration</div>
            <div class="th th-right" style="width:5rem">When</div>
          </div>
          {#each allHostRequests as req (req.id || req.url + req.occurred_at)}
            <button class="table-row" onclick={() => openRequest(req)}>
              <div class="td" style="width:4.5rem">
                <span class="status-badge {sc(req.status_code)}">{req.status_code}</span>
              </div>
              <div class="td td-url" style="flex:3">
                <span class="url-text">{req.url}</span>
              </div>
              <div class="td td-num" style="width:5.5rem" class:td-danger={req.duration_ms > 2000}>{fmt(req.duration_ms)}</div>
              <div class="td td-num" style="width:5rem"><span class="time-ago">{timeAgo(req.occurred_at)}</span></div>
            </button>
          {/each}
          <InfiniteScroll loading={loadingMore} hasMore={has_more} onLoadMore={loadMore} />
        </div>
      </div>

    {:else}
      <!-- Stat Cards -->
      <div class="stat-grid">
        <div class="stat-card">
          <span class="stat-card-label">Total Requests</span>
          <span class="stat-card-value">{total_http_requests.toLocaleString()}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Unique Hosts</span>
          <span class="stat-card-value">{uniqueHosts.toLocaleString()}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Avg Duration</span>
          <span class="stat-card-value">{fmt(avgDuration)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Error Rate</span>
          <span class="stat-card-value" class:stat-danger={totalErrors > 0}>{errorRate}%</span>
        </div>
      </div>

      <!-- Volume Chart -->
      {#if volume_series.length >= 2}
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Request Volume</h2>
            <span class="card-subtitle">Over time</span>
          </div>
          <div class="card-body">
            <AreaChart data={volume_series} width={700} height={80} color="#3b82f6" />
          </div>
        </div>
      {/if}

      <!-- Hosts Table -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Hosts</h2>
          <span class="card-subtitle">{hosts.length} hosts</span>
        </div>
        <div class="data-table">
          <div class="table-header">
            <div class="th" style="flex:2">Host</div>
            <div class="th th-right" style="width:5rem"><SortableHeader column="total" label="Requests" /></div>
            <div class="th th-right" style="width:5rem"><SortableHeader column="avg_duration" label="Avg" /></div>
            <div class="th th-right" style="width:5rem"><SortableHeader column="max_duration" label="Max" /></div>
            <div class="th th-right" style="width:4.5rem">Errors</div>
          </div>
          {#each allHosts as host, i (host.host + ':' + i)}
            <button class="table-row" onclick={() => selectHost(host)}>
              <div class="td" style="flex:2"><span class="host-name">{host.host}</span></div>
              <div class="td td-num" style="width:5rem">{host.total}</div>
              <div class="td td-num" style="width:5rem">{fmt(host.avg_duration)}</div>
              <div class="td td-num" style="width:5rem" class:td-danger={host.max_duration > 5000}>{fmt(host.max_duration)}</div>
              <div class="td td-num" style="width:4.5rem" class:td-danger={host.error_count > 0}>{host.error_count || 0}</div>
            </button>
          {/each}
          {#if allHosts.length === 0}
            <div class="table-empty">
              <svg width="24" height="24" fill="none" stroke="#94a3b8" stroke-width="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span>No outgoing HTTP requests recorded in this period.</span>
            </div>
          {/if}
          <InfiniteScroll loading={loadingMore} hasMore={has_more} onLoadMore={loadMore} />
        </div>
      </div>
    {/if}
  </div>
</DaylightLayout>

<EwSheet bind:open={sheetOpen} title="HTTP Request Detail" aiContext={sheetAi}>
  {#if sheetItem}
    <div class="sheet-detail">
      <dl class="dl">
        {#if sheetItem.method}<div class="dl-row"><dt>Method</dt><dd>{sheetItem.method}</dd></div>{/if}
        <div class="dl-row"><dt>URL</dt><dd class="mono">{sheetItem.url}</dd></div>
        <div class="dl-row"><dt>Status</dt><dd><span class="status-badge {sc(sheetItem.status_code)}">{sheetItem.status_code}</span></dd></div>
        <div class="dl-row"><dt>Duration</dt><dd class:td-danger={sheetItem.duration_ms > 2000}>{fmt(sheetItem.duration_ms)}</dd></div>
        {#if sheetItem.occurred_at}<div class="dl-row"><dt>Time</dt><dd>{new Date(sheetItem.occurred_at).toLocaleString()}</dd></div>{/if}
      </dl>

      {#if sheetItem.response_body}
        <h4 class="sheet-sub">Response</h4>
        <pre class="sheet-pre">{sheetItem.response_body}</pre>
      {/if}
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

  .period-selector {
    flex-shrink: 0;
  }

  /* Back button + drilldown */
  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #64748b;
    border: none;
    background: none;
    font-family: inherit;
    cursor: pointer;
    padding: 0.25rem 0;
    transition: color 0.15s;
  }

  .back-btn:hover { color: #0f172a; }

  .drilldown-header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin-top: -0.5rem;
  }

  .route-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
  }

  .drilldown-count {
    font-size: 0.75rem;
    color: #64748b;
    font-weight: 500;
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

  .stat-danger { color: #ef4444; }

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

  .td-url {
    min-width: 0;
  }

  .url-text {
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

  .host-name {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #0f172a;
  }

  .time-ago {
    font-size: 0.6875rem;
    color: #64748b;
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

  .s2xx { background: #dcfce7; color: #15803d; }
  .s4xx { background: #fef3c7; color: #b45309; }
  .s5xx { background: #fee2e2; color: #dc2626; }

  .table-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2.5rem 1rem;
    color: #94a3b8;
    font-size: 0.8125rem;
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
    align-items: center;
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
    word-break: break-all;
  }

  .sheet-sub {
    font-size: 0.6875rem;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0;
  }

  .sheet-pre {
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

  /* Responsive */
  @media (max-width: 640px) {
    .stat-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>

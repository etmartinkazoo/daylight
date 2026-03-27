<script>
  import { router } from "@inertiajs/svelte";
  import { fmt, timeAgo, statusCodeClass } from "@/lib/formatters.js";
  import DaylightLayout from "../DaylightLayout.svelte";
  import PeriodSelect from "../PeriodSelect.svelte";
  import EwSheet from "../errors/EwSheet.svelte";
  import SortableHeader from "@/components/ui/SortableHeader.svelte";
  import AreaChart from "@/components/charts/AreaChart.svelte";
  import InfiniteScroll from "@/components/ui/InfiniteScroll.svelte";

  let {
    hosts = [], host_requests = [], selected_host = null,
    period = "24h", total_http_requests = 0, volume_series = [],
    page = 1, has_more = false,
    base_path: base = "/daylight",
    sort_column = null, sort_direction = null,
  } = $props();

  let sheetOpen = $state(false);
  let sheetItem = $state(null);

  function changePeriod(p) { router.get(`${base}/http_requests`, { period: p }, { preserveState: true }); }

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
  <div class="dl-page">
    <div class="dl-page-header">
      <div>
        <h1 class="dl-page-title">Outgoing HTTP</h1>
        <p class="dl-page-subtitle">{total_http_requests.toLocaleString()} requests in the last {period}</p>
      </div>
      <div class="dl-period-selector">
        <PeriodSelect value={period} onchange={changePeriod} />
      </div>
    </div>

    {#if selected_host && allHostRequests.length > 0}
      <button class="dl-back-btn back-btn-reset" onclick={goBack}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        All hosts
      </button>
      <div class="drilldown-header">
        <h2 class="route-title">{selected_host}</h2>
        <span class="drilldown-count">{allHostRequests.length} requests</span>
      </div>

      <div class="dl-card">
        <div class="dl-data-table">
          <div class="dl-table-header">
            <div class="dl-th" style="width:4.5rem">Status</div>
            <div class="dl-th" style="flex:3">URL</div>
            <div class="dl-th dl-th-right" style="width:5.5rem">Duration</div>
            <div class="dl-th dl-th-right" style="width:5rem">When</div>
          </div>
          {#each allHostRequests as req (req.id || req.url + req.occurred_at)}
            <button class="dl-table-row" onclick={() => openRequest(req)}>
              <div class="dl-td" style="width:4.5rem">
                <span class="status-badge dl-{statusCodeClass(req.status_code)}">{req.status_code}</span>
              </div>
              <div class="dl-td td-url" style="flex:3">
                <span class="url-text">{req.url}</span>
              </div>
              <div class="dl-td dl-td-num" style="width:5.5rem" class:td-danger={req.duration_ms > 2000}>{fmt(req.duration_ms)}</div>
              <div class="dl-td dl-td-num" style="width:5rem"><span class="time-ago">{timeAgo(req.occurred_at)}</span></div>
            </button>
          {/each}
          <InfiniteScroll loading={loadingMore} hasMore={has_more} onLoadMore={loadMore} />
        </div>
      </div>

    {:else}
      <div class="dl-stat-grid">
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

      {#if volume_series.length >= 2}
        <div class="dl-card">
          <div class="dl-card-header">
            <h2 class="dl-card-title">Request Volume</h2>
            <span class="dl-card-subtitle">Over time</span>
          </div>
          <div class="dl-card-body">
            <AreaChart data={volume_series} width={700} height={80} color="#3b82f6" />
          </div>
        </div>
      {/if}

      <div class="dl-card">
        <div class="dl-card-header">
          <h2 class="dl-card-title">Hosts</h2>
          <span class="dl-card-subtitle">{hosts.length} hosts</span>
        </div>
        <div class="dl-data-table">
          <div class="dl-table-header">
            <div class="dl-th" style="flex:2">Host</div>
            <div class="dl-th dl-th-right" style="width:5rem"><SortableHeader column="total" label="Requests" {sort_column} {sort_direction} /></div>
            <div class="dl-th dl-th-right" style="width:5rem"><SortableHeader column="avg_duration" label="Avg" {sort_column} {sort_direction} /></div>
            <div class="dl-th dl-th-right" style="width:5rem"><SortableHeader column="max_duration" label="Max" {sort_column} {sort_direction} /></div>
            <div class="dl-th dl-th-right" style="width:4.5rem">Errors</div>
          </div>
          {#each allHosts as host, i (host.host + ':' + i)}
            <button class="dl-table-row" onclick={() => selectHost(host)}>
              <div class="dl-td" style="flex:2"><span class="host-name">{host.host}</span></div>
              <div class="dl-td dl-td-num" style="width:5rem">{host.total}</div>
              <div class="dl-td dl-td-num" style="width:5rem">{fmt(host.avg_duration)}</div>
              <div class="dl-td dl-td-num" style="width:5rem" class:td-danger={host.max_duration > 5000}>{fmt(host.max_duration)}</div>
              <div class="dl-td dl-td-num" style="width:4.5rem" class:td-danger={host.error_count > 0}>{host.error_count || 0}</div>
            </button>
          {/each}
          {#if allHosts.length === 0}
            <div class="dl-table-empty">
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
    <div class="dl-sheet-detail">
      <dl class="dl-dl">
        {#if sheetItem.method}<div class="dl-dl-row"><dt>Method</dt><dd>{sheetItem.method}</dd></div>{/if}
        <div class="dl-dl-row"><dt>URL</dt><dd class="dl-mono">{sheetItem.url}</dd></div>
        <div class="dl-dl-row"><dt>Status</dt><dd><span class="status-badge dl-{statusCodeClass(sheetItem.status_code)}">{sheetItem.status_code}</span></dd></div>
        <div class="dl-dl-row"><dt>Duration</dt><dd class:td-danger={sheetItem.duration_ms > 2000}>{fmt(sheetItem.duration_ms)}</dd></div>
        {#if sheetItem.occurred_at}<div class="dl-dl-row"><dt>Time</dt><dd>{new Date(sheetItem.occurred_at).toLocaleString()}</dd></div>{/if}
      </dl>

      {#if sheetItem.response_body}
        <h4 class="sheet-sub">Response</h4>
        <pre class="sheet-pre">{sheetItem.response_body}</pre>
      {/if}
    </div>
  {/if}
</EwSheet>

<style>
  .back-btn-reset { border: none; background: none; font-family: inherit; cursor: pointer; padding: 0.25rem 0; }
  .drilldown-header { display: flex; align-items: baseline; gap: 0.75rem; margin-top: -0.5rem; }
  .route-title { font-size: 0.9375rem; font-weight: 600; color: var(--color-fg); margin: 0; font-family: "SF Mono", Monaco, Menlo, Consolas, monospace; }
  .drilldown-count { font-size: 0.75rem; color: var(--color-muted); font-weight: 500; }
  .stat-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
  .stat-card-label { font-size: 0.8125rem; font-weight: 500; color: var(--color-muted); }
  .stat-card-value { font-size: 1.75rem; font-weight: 700; color: var(--color-fg); letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; }
  .stat-danger { color: var(--color-danger); }
  .host-name { font-size: 0.8125rem; font-weight: 600; color: var(--color-fg); }
  .td-url { min-width: 0; }
  .url-text { font-family: "SF Mono", Monaco, Menlo, Consolas, monospace; font-size: 0.75rem; color: var(--color-fg-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
  .td-danger { color: var(--color-danger); font-weight: 600; }
  .time-ago { font-size: 0.6875rem; color: var(--color-muted); }
  .status-badge { display: inline-flex; align-items: center; justify-content: center; font-size: 0.6875rem; font-weight: 700; font-variant-numeric: tabular-nums; padding: 0.125rem 0.5rem; border-radius: 9999px; }
  .sheet-sub { font-size: 0.6875rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
  .sheet-pre { font-size: 0.75rem; font-family: "SF Mono", Monaco, Menlo, Consolas, monospace; background: var(--color-surface); padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.5rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.6; color: var(--color-fg-tertiary); }
</style>

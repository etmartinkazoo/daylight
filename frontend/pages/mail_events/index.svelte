<script>
  import { router, usePage } from "@inertiajs/svelte";
  import DaylightLayout from "../DaylightLayout.svelte";
  import Badge from "@/components/ui/Badge.svelte";
  import Button from "@/components/ui/Button.svelte";
  import Table from "@/components/ui/Table.svelte";
  import SortableHeader from "@/components/ui/SortableHeader.svelte";
  import PeriodSelect from "../PeriodSelect.svelte";
  import EwSheet from "../errors/EwSheet.svelte";
  import TimeSeriesChart from "@/components/charts/TimeSeriesChart.svelte";
  import ExportButton from "@/components/ui/ExportButton.svelte";
  import InfiniteScroll from "@/components/ui/InfiniteScroll.svelte";

  let { mailers = [], events = [], totals = {}, period = "24h", volume_series = [], page = 1, has_more = false } = $props();
  const pageStore = usePage();
  let base = $derived($pageStore.props?.base_path || "/daylight");

  let sheetOpen = $state(false);
  let sheetItem = $state(null);
  let sheetType = $state("mailer");

  function changePeriod(p) { router.get(`${base}/mail_events`, { period: p }, { preserveState: true }); }
  function fmt(ms) { if (ms == null) return "—"; return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`; }
  function timeAgo(d) { if (!d) return ""; const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`; }
  function formatTime(d) { if (!d) return ""; return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }

  function openMailer(ml) { sheetItem = ml; sheetType = "mailer"; sheetOpen = true; }
  function openEvent(ev) { sheetItem = ev; sheetType = "event"; sheetOpen = true; }

  let sheetTitle = $derived(
    sheetType === "mailer" ? (sheetItem?.mailer_class || "Mailer") :
    `${sheetItem?.mailer_class || "Mail"}: ${sheetItem?.subject || "Event"}`
  );

  let sheetAi = $derived.by(() => {
    if (!sheetItem) return "";
    if (sheetType === "mailer") return `Mailer Class: ${sheetItem.mailer_class}\nTotal: ${sheetItem.total}\nDelivered: ${sheetItem.delivered_count}\nFailed: ${sheetItem.failed_count}\nAvg duration: ${fmt(sheetItem.avg_duration)}`;
    return `Mailer: ${sheetItem.mailer_class}\nSubject: ${sheetItem.subject || "—"}\nRecipients: ${sheetItem.recipients || "—"}\nChannel: ${sheetItem.channel || "email"}\nStatus: ${sheetItem.status || "—"}\nTime: ${sheetItem.occurred_at}`;
  });

  let deliveryRate = $derived(totals.total > 0 ? Math.round(((totals.delivered || 0) / totals.total) * 100) : 0);

  let allMailers = $state(mailers);
  let currentPage = $state(page);
  let loadingMore = $state(false);

  $effect(() => {
    period;
    allMailers = mailers;
    currentPage = page;
  });

  function loadMore() {
    if (loadingMore || !has_more) return;
    loadingMore = true;
    router.get(`${base}/mail_events`, { period, page: currentPage + 1 }, {
      preserveState: true,
      preserveScroll: true,
      only: ['mailers', 'page', 'has_more'],
      onSuccess: (p) => {
        const newItems = p.props.mailers || [];
        allMailers = [...allMailers, ...newItems];
        currentPage = p.props.page;
        has_more = p.props.has_more;
        loadingMore = false;
      },
      onError: () => { loadingMore = false; }
    });
  }
</script>

<svelte:head><title>Mail & Notifications — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="mail-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Mail & Notifications</h1>
        <p class="page-subtitle">Email and notification delivery monitoring</p>
      </div>
      <div class="header-controls">
        <ExportButton baseUrl={`${base}/mail_events/export`} />
        <PeriodSelect value={period} onchange={changePeriod} />
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="stat-cards">
      <div class="stat-card">
        <span class="stat-card-label">Total Sent</span>
        <span class="stat-card-value">{totals.total || 0}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Delivered</span>
        <span class="stat-card-value" style="color: #22c55e">{totals.delivered || 0}</span>
      </div>
      <div class="stat-card {totals.failed > 0 ? 'stat-card-danger' : ''}">
        <span class="stat-card-label">Failed</span>
        <span class="stat-card-value">{totals.failed || 0}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Delivery Rate</span>
        <span class="stat-card-value" style="color: {deliveryRate >= 95 ? '#22c55e' : deliveryRate >= 80 ? '#f59e0b' : '#ef4444'}">{deliveryRate}%</span>
      </div>
    </div>

    <!-- Volume Time Series -->
    {#if volume_series.length > 0}
      <div class="chart-section">
        <TimeSeriesChart
          data={volume_series}
          width={720}
          height={180}
          color="#8b5cf6"
          label="Mail volume over time"
          showArea={true}
        />
      </div>
    {/if}

    <!-- Mailers Table -->
    {#if allMailers.length > 0}
      <div class="section">
        <h2 class="section-title">Mailer Classes</h2>
        <div class="table-container">
          <div class="table-header">
            <div class="th" style="flex:2">Mailer Class</div>
            <div class="th r" style="width:4rem"><SortableHeader column="total" label="Total" /></div>
            <div class="th r" style="width:5rem"><SortableHeader column="delivered_count" label="Delivered" /></div>
            <div class="th r" style="width:4rem"><SortableHeader column="failed_count" label="Failed" /></div>
            <div class="th r" style="width:5rem"><SortableHeader column="avg_duration" label="Avg" /></div>
          </div>
          {#each allMailers as ml, i (ml.mailer_class + ':' + i)}
            <button class="table-row" onclick={() => openMailer(ml)}>
              <div class="td" style="flex:2"><span class="mailer-name">{ml.mailer_class}</span></div>
              <div class="td num" style="width:4rem">{ml.total}</div>
              <div class="td num delivered" style="width:5rem">{ml.delivered_count}</div>
              <div class="td num" style="width:4rem" class:failed-val={ml.failed_count > 0}>{ml.failed_count}</div>
              <div class="td num" style="width:5rem">{fmt(ml.avg_duration)}</div>
            </button>
          {/each}
          <InfiniteScroll loading={loadingMore} hasMore={has_more} onLoadMore={loadMore} />
        </div>
      </div>
    {/if}

    <!-- Recent Events -->
    {#if events.length > 0}
      <div class="section">
        <h2 class="section-title">Recent Events</h2>
        <div class="table-container">
          <div class="table-header">
            <div class="th" style="flex:1.5">Mailer</div>
            <div class="th" style="flex:1">Subject</div>
            <div class="th" style="width:5rem">Status</div>
            <div class="th" style="width:4rem">Channel</div>
            <div class="th r" style="width:5.5rem">When</div>
          </div>
          {#each events as ev (ev.id)}
            <button class="table-row" onclick={() => openEvent(ev)}>
              <div class="td" style="flex:1.5">
                <span class="event-mailer">{ev.mailer_class || "Unknown"}</span>
              </div>
              <div class="td" style="flex:1">
                <span class="event-subject">{ev.subject || "—"}</span>
              </div>
              <div class="td" style="width:5rem">
                <span class="event-status" class:status-delivered={ev.status === "delivered"} class:status-failed={ev.status === "failed"}>{ev.status || "—"}</span>
              </div>
              <div class="td" style="width:4rem">
                <span class="event-channel">{ev.channel || "email"}</span>
              </div>
              <div class="td r" style="width:5.5rem">
                <span class="event-time">{timeAgo(ev.occurred_at)}</span>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {:else if allMailers.length === 0}
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <p class="empty-title">No mail data yet</p>
        <p class="empty-sub">Mail events will appear here once your app starts sending emails.</p>
      </div>
    {/if}
  </div>
</DaylightLayout>

<EwSheet bind:open={sheetOpen} title={sheetTitle} aiContext={sheetAi}>
  {#if sheetItem}
    <div class="sheet-detail">
      {#if sheetType === "mailer"}
        <dl class="dl">
          <div class="dl-row"><dt>Mailer Class</dt><dd>{sheetItem.mailer_class}</dd></div>
          <div class="dl-row"><dt>Total</dt><dd>{sheetItem.total}</dd></div>
          <div class="dl-row"><dt>Delivered</dt><dd class="ok">{sheetItem.delivered_count}</dd></div>
          <div class="dl-row"><dt>Failed</dt><dd class:err={sheetItem.failed_count > 0}>{sheetItem.failed_count}</dd></div>
          <div class="dl-row"><dt>Avg Duration</dt><dd>{fmt(sheetItem.avg_duration)}</dd></div>
        </dl>

      {:else}
        <dl class="dl">
          <div class="dl-row"><dt>Mailer Class</dt><dd>{sheetItem.mailer_class}</dd></div>
          <div class="dl-row"><dt>Subject</dt><dd>{sheetItem.subject || "—"}</dd></div>
          <div class="dl-row"><dt>Recipients</dt><dd>{sheetItem.recipients || "—"}</dd></div>
          <div class="dl-row"><dt>Channel</dt><dd><span class="channel-badge">{sheetItem.channel || "email"}</span></dd></div>
          <div class="dl-row"><dt>Status</dt><dd><span class="event-status" class:status-delivered={sheetItem.status === "delivered"} class:status-failed={sheetItem.status === "failed"}>{sheetItem.status || "—"}</span></dd></div>
          {#if sheetItem.duration_ms}<div class="dl-row"><dt>Duration</dt><dd>{fmt(sheetItem.duration_ms)}</dd></div>{/if}
          <div class="dl-row"><dt>Time</dt><dd>{formatTime(sheetItem.occurred_at)}</dd></div>
        </dl>
        {#if sheetItem.error_message}
          <h4 class="sheet-sub">Error</h4>
          <pre class="sheet-pre">{sheetItem.error_message}</pre>
        {/if}
      {/if}
    </div>
  {/if}
</EwSheet>

<style>
  /* Page layout */
  .mail-page { display: flex; flex-direction: column; gap: 1.5rem; }

  .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .page-title { font-size: 1.375rem; font-weight: 700; color: var(--color-fg); margin: 0; letter-spacing: -0.02em; }
  .page-subtitle { font-size: 0.8125rem; color: var(--color-muted); margin: 0.25rem 0 0; }
  .header-controls { display: flex; align-items: center; gap: 0.5rem; }
  .chart-section {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.25rem;
  }

  .section { display: flex; flex-direction: column; gap: 0.75rem; }
  .section-title { font-size: 0.875rem; font-weight: 600; color: var(--color-fg); margin: 0; }

  /* Stat Cards */
  .stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
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
  .stat-card-danger { border-color: var(--color-danger-border); background: var(--color-danger-bg); }
  .stat-card-danger .stat-card-value { color: var(--color-danger); }

  /* Tables */
  .table-container {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }
  .table-header {
    display: flex;
    align-items: center;
    padding: 0 1rem;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }
  .th {
    padding: 0.625rem 0.5rem;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
  }
  .r { text-align: right; }
  .table-row {
    display: flex;
    align-items: center;
    padding: 0 1rem;
    border-bottom: 1px solid var(--color-accent);
    width: 100%;
    border-left: none;
    border-right: none;
    border-top: none;
    background: none;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s ease;
  }
  .table-row:last-child { border-bottom: none; }
  .table-row:hover { background: var(--color-surface); }
  .td {
    padding: 0.5625rem 0.5rem;
    font-size: 0.8125rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-fg-tertiary);
  }
  .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
  .delivered { color: var(--color-success); }
  .failed-val { color: var(--color-danger); font-weight: 600; }
  .mailer-name { font-size: 0.8125rem; font-weight: 600; color: var(--color-fg); }
  .event-mailer { font-size: 0.8125rem; font-weight: 600; color: var(--color-fg); }
  .event-subject { font-size: 0.75rem; color: var(--color-fg-tertiary); }
  .event-time { font-size: 0.75rem; color: var(--color-muted-light); font-variant-numeric: tabular-nums; }

  /* Status badges */
  .event-status {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: capitalize;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background: var(--color-accent);
    color: var(--color-muted);
  }
  .status-delivered { background: var(--color-status-2xx-bg); color: var(--color-status-2xx); }
  .status-failed { background: var(--color-status-5xx-bg); color: var(--color-danger-hover); }

  .event-channel {
    font-size: 0.6875rem;
    color: var(--color-muted);
    background: var(--color-accent);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
  }

  .channel-badge {
    font-size: 0.6875rem;
    color: var(--color-muted);
    padding: 0.125rem 0.5rem;
    background: var(--color-accent);
    border-radius: 0.25rem;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    text-align: center;
  }
  .empty-icon { margin-bottom: 1rem; }
  .empty-title { font-size: 0.9375rem; font-weight: 600; color: var(--color-fg); margin: 0; }
  .empty-sub { font-size: 0.8125rem; color: var(--color-muted-light); margin: 0.25rem 0 0; }

  /* Sheet styles */
  .sheet-detail { display: flex; flex-direction: column; gap: 1rem; }
  .dl { display: flex; flex-direction: column; margin: 0; }
  .dl-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--color-accent); font-size: 0.8125rem; }
  .dl-row:last-child { border-bottom: none; }
  .dl-row dt { color: var(--color-muted); font-weight: 500; }
  .dl-row dd { color: var(--color-fg); font-weight: 500; margin: 0; }
  .ok { color: var(--color-success); }
  .err { color: var(--color-danger); font-weight: 600; }
  .sheet-sub { font-size: 0.6875rem; font-weight: 600; color: var(--color-muted-light); text-transform: uppercase; letter-spacing: 0.04em; margin: 0; }
  .sheet-pre { font-size: 0.6875rem; font-family: "SF Mono", Monaco, Menlo, monospace; background: var(--color-danger-subtle); padding: 0.75rem; border: 1px solid var(--color-danger-border); border-radius: 0.5rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; color: var(--color-danger); line-height: 1.6; }

  /* Responsive */
  @media (max-width: 768px) {
    .stat-cards { grid-template-columns: repeat(2, 1fr); }
  }
</style>

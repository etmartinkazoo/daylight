<script>
  import { router } from "@inertiajs/svelte";
  import { timeAgo } from "@/lib/formatters.js";
  import DaylightLayout from "../DaylightLayout.svelte";
  import PeriodSelect from "../PeriodSelect.svelte";
  import EwSheet from "../errors/EwSheet.svelte";
  import SortableHeader from "@/components/ui/SortableHeader.svelte";
  import AreaChart from "@/components/charts/AreaChart.svelte";
  import InfiniteScroll from "@/components/ui/InfiniteScroll.svelte";

  let { logs = [], counts = {}, period = "24h", level = null, total_logs = 0, volume_series = [], page = 1, has_more = false, base_path: base = "/daylight", sort_column = null, sort_direction = null } = $props();

  let sheetOpen = $state(false);
  let sheetItem = $state(null);

  let warnCount = $derived(counts.warn || 0);
  let errorCount = $derived(counts.error || 0);
  let fatalCount = $derived(counts.fatal || 0);

  function changePeriod(p) { router.get(`${base}/logs`, { period: p, level }, { preserveState: true }); }
  function changeLevel(l) { router.get(`${base}/logs`, { period, level: l }, { preserveState: true }); }

  function levelClass(l) {
    if (l === "debug") return "level-debug";
    if (l === "info") return "level-info";
    if (l === "warn") return "level-warn";
    if (l === "error") return "level-error";
    if (l === "fatal") return "level-fatal";
    return "level-debug";
  }

  function openLog(log) { sheetItem = log; sheetOpen = true; }

  let allLogs = $state(logs);
  let currentPage = $state(page);
  let loadingMore = $state(false);

  $effect(() => {
    period; level;
    allLogs = logs;
    currentPage = page;
  });

  function loadMore() {
    if (loadingMore || !has_more) return;
    loadingMore = true;
    router.get(`${base}/logs`, { period, level, page: currentPage + 1 }, {
      preserveState: true,
      preserveScroll: true,
      only: ['logs', 'page', 'has_more'],
      onSuccess: (p) => {
        const newLogs = p.props.logs || [];
        allLogs = [...allLogs, ...newLogs];
        currentPage = p.props.page;
        has_more = p.props.has_more;
        loadingMore = false;
      },
      onError: () => { loadingMore = false; }
    });
  }

  let sheetAi = $derived.by(() => {
    if (!sheetItem) return "";
    return `Log Entry:\nLevel: ${sheetItem.level}\nMessage: ${sheetItem.message}\nController: ${sheetItem.controller || "N/A"}\nPath: ${sheetItem.path || "N/A"}\nTime: ${sheetItem.occurred_at || "N/A"}`;
  });

  let tabs = $derived([
    { label: "All", value: null, count: total_logs },
    { label: "Warn", value: "warn", count: warnCount },
    { label: "Error", value: "error", count: errorCount },
    { label: "Fatal", value: "fatal", count: fatalCount },
  ]);
</script>

<svelte:head><title>Logs — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="dl-page">
    <!-- Header -->
    <div class="dl-page-header">
      <div>
        <h1 class="dl-page-title">Logs</h1>
        <p class="dl-page-subtitle">Application log entries in the last {period}</p>
      </div>
      <div class="dl-period-selector">
        <PeriodSelect value={period} onchange={changePeriod} />
      </div>
    </div>

    <!-- Level Tabs -->
    <div class="level-tabs">
      {#each tabs as tab (tab.label)}
        <button
          class="level-tab"
          class:active={level === tab.value}
          onclick={() => changeLevel(tab.value)}
        >
          {tab.label}
          {#if tab.count > 0}
            <span class="tab-count">{tab.count.toLocaleString()}</span>
          {/if}
        </button>
      {/each}
    </div>

    <!-- Stat Cards -->
    <div class="dl-stat-grid">
      <div class="stat-card">
        <span class="stat-card-label">Total Logs</span>
        <span class="stat-card-value">{total_logs.toLocaleString()}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Warn</span>
        <span class="stat-card-value" class:stat-warn={warnCount > 0}>{warnCount.toLocaleString()}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Error</span>
        <span class="stat-card-value" class:stat-danger={errorCount > 0}>{errorCount.toLocaleString()}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Fatal</span>
        <span class="stat-card-value" class:stat-fatal={fatalCount > 0}>{fatalCount.toLocaleString()}</span>
      </div>
    </div>

    <!-- Volume Chart -->
    {#if volume_series.length >= 2}
      <div class="dl-card">
        <div class="dl-card-header">
          <h2 class="dl-card-title">Log Volume</h2>
          <span class="dl-card-subtitle">Over time</span>
        </div>
        <div class="dl-card-body">
          <AreaChart data={volume_series} width={700} height={80} color="#6366f1" />
        </div>
      </div>
    {/if}

    <!-- Logs Table -->
    <div class="dl-card">
      <div class="dl-card-header">
        <h2 class="dl-card-title">Log Entries</h2>
        <span class="dl-card-subtitle">{logs.length} entries</span>
      </div>
      <div class="dl-data-table">
        <div class="dl-table-header">
          <div class="dl-th" style="width:5rem">Level</div>
          <div class="dl-th" style="flex:3">Message</div>
          <div class="dl-th" style="flex:1">Controller</div>
          <div class="dl-th" style="flex:1">Path</div>
          <div class="dl-th dl-th-right" style="width:5rem">Time</div>
        </div>
        {#each allLogs as log (log.id || log.message + log.occurred_at)}
          <button class="dl-table-row" onclick={() => openLog(log)}>
            <div class="dl-td" style="width:5rem">
              <span class="level-badge {levelClass(log.level)}">{log.level}</span>
            </div>
            <div class="dl-td td-message" style="flex:3">
              <span class="message-text">{log.message}</span>
            </div>
            <div class="dl-td td-source" style="flex:1">{log.controller || "\u2014"}</div>
            <div class="dl-td td-source" style="flex:1">{log.path || "\u2014"}</div>
            <div class="dl-td dl-td-num" style="width:5rem">{timeAgo(log.occurred_at)}</div>
          </button>
        {/each}
        {#if allLogs.length === 0}
          <div class="dl-table-empty">
            <svg width="24" height="24" fill="none" stroke="#94a3b8" stroke-width="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span>No log entries recorded in this period.</span>
          </div>
        {/if}
        <InfiniteScroll loading={loadingMore} hasMore={has_more} onLoadMore={loadMore} />
      </div>
    </div>
  </div>
</DaylightLayout>

<EwSheet bind:open={sheetOpen} title="Log Detail" aiContext={sheetAi}>
  {#if sheetItem}
    <div class="dl-sheet-detail">
      <dl class="dl-dl">
        <div class="dl-dl-row"><dt>Level</dt><dd><span class="level-badge {levelClass(sheetItem.level)}">{sheetItem.level}</span></dd></div>
        {#if sheetItem.controller}<div class="dl-dl-row"><dt>Controller</dt><dd>{sheetItem.controller}</dd></div>{/if}
        {#if sheetItem.path}<div class="dl-dl-row"><dt>Path</dt><dd class="dl-mono">{sheetItem.path}</dd></div>{/if}
        {#if sheetItem.occurred_at}<div class="dl-dl-row"><dt>Time</dt><dd>{new Date(sheetItem.occurred_at).toLocaleString()}</dd></div>{/if}
      </dl>

      <h4 class="sheet-sub">Message</h4>
      <pre class="sheet-message">{sheetItem.message}</pre>
    </div>
  {/if}
</EwSheet>

<style>
  .level-tabs { display: flex; gap: 0.25rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 0.25rem; width: fit-content; }
  .level-tab { display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; font-size: 0.8125rem; font-weight: 500; color: var(--color-muted); border: none; background: none; border-radius: 0.5rem; cursor: pointer; font-family: inherit; transition: all 0.15s ease; }
  .level-tab:hover { background: var(--color-accent); color: var(--color-fg); }
  .level-tab.active { background: var(--color-fg); color: var(--color-bg); font-weight: 600; }
  .tab-count { font-size: 0.6875rem; font-weight: 600; font-variant-numeric: tabular-nums; opacity: 0.7; }

  .stat-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
  .stat-card-label { font-size: 0.8125rem; font-weight: 500; color: var(--color-muted); }
  .stat-card-value { font-size: 1.75rem; font-weight: 700; color: var(--color-fg); letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; }
  .stat-warn { color: var(--color-warning); }
  .stat-danger { color: var(--color-danger); }
  .stat-fatal { color: var(--color-purple); }

  .td-message { min-width: 0; }
  .message-text { font-size: 0.8125rem; color: var(--color-fg-tertiary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
  .td-source { font-size: 0.75rem; color: var(--color-muted); }

  .level-badge { display: inline-flex; align-items: center; justify-content: center; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; padding: 0.125rem 0.5rem; border-radius: 9999px; }
  .level-debug { background: var(--color-accent); color: var(--color-muted); }
  .level-info { background: var(--color-info-bg); color: var(--color-info-dark); }
  .level-warn { background: var(--color-warning-bg); color: var(--color-status-4xx); }
  .level-error { background: var(--color-status-5xx-bg); color: var(--color-danger-hover); }
  .level-fatal { background: var(--color-purple-subtle); color: var(--color-purple); }

  .sheet-sub { font-size: 0.6875rem; font-weight: 600; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
  .sheet-message { font-size: 0.75rem; font-family: "SF Mono", Monaco, Menlo, Consolas, monospace; background: var(--color-surface); padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.5rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.6; color: var(--color-fg-tertiary); }
</style>

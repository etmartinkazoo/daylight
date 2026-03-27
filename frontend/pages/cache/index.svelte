<script>
  import { router, usePage } from "@inertiajs/svelte";
  import DaylightLayout from "../DaylightLayout.svelte";
  import PeriodSelect from "../PeriodSelect.svelte";
  import EwSheet from "../errors/EwSheet.svelte";
  import SortableHeader from "@/components/ui/SortableHeader.svelte";
  import AreaChart from "@/components/charts/AreaChart.svelte";
  import DonutChart from "@/components/charts/DonutChart.svelte";
  import InfiniteScroll from "@/components/ui/InfiniteScroll.svelte";

  let { stats = {}, patterns = [], period = "24h", total_events = 0, volume_series = [], page = 1, has_more = false } = $props();
  const pageStore = usePage();
  let base = $derived(pageStore.props?.base_path || "/daylight");

  let sheetOpen = $state(false);
  let sheetItem = $state(null);

  function changePeriod(p) { router.get(`${base}/cache`, { period: p }, { preserveState: true }); }
  function fmt(ms) { if (ms == null) return "\u2014"; return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`; }

  let hitRate = $derived(stats.hit_rate != null ? stats.hit_rate : 0);
  let hitRateDisplay = $derived(`${(hitRate * 100).toFixed(1)}%`);
  let hitRateClass = $derived(hitRate >= 0.9 ? "stat-ok" : hitRate >= 0.7 ? "stat-warn" : "stat-danger");

  let totalReads = $derived(stats.total_reads || 0);
  let totalWrites = $derived(stats.total_writes || 0);
  let totalDeletes = $derived(stats.total_deletes || 0);

  let hits = $derived(stats.hits || 0);
  let misses = $derived(stats.misses || 0);

  let donutSegments = $derived([
    { value: hits, color: "#22c55e", label: "Hits" },
    { value: misses, color: "#ef4444", label: "Misses" },
  ].filter(s => s.value > 0));

  function openPattern(p) { sheetItem = p; sheetOpen = true; }

  let sheetAi = $derived.by(() => {
    if (!sheetItem) return "";
    return `Cache Key Pattern: ${sheetItem.key_pattern}\nReads: ${sheetItem.reads}\nWrites: ${sheetItem.writes}\nHit Rate: ${sheetItem.hit_rate != null ? (sheetItem.hit_rate * 100).toFixed(1) + "%" : "N/A"}\nAvg Duration: ${fmt(sheetItem.avg_duration)}`;
  });

  let allPatterns = $state(patterns);
  let currentPage = $state(page);
  let loadingMore = $state(false);

  $effect(() => {
    period;
    allPatterns = patterns;
    currentPage = page;
  });

  function loadMore() {
    if (loadingMore || !has_more) return;
    loadingMore = true;
    router.get(`${base}/cache`, { period, page: currentPage + 1 }, {
      preserveState: true,
      preserveScroll: true,
      only: ['patterns', 'page', 'has_more'],
      onSuccess: (p) => {
        const newItems = p.props.patterns || [];
        allPatterns = [...allPatterns, ...newItems];
        currentPage = p.props.page;
        has_more = p.props.has_more;
        loadingMore = false;
      },
      onError: () => { loadingMore = false; }
    });
  }

  function patternHitRateClass(rate) {
    if (rate == null) return "";
    if (rate >= 0.9) return "rate-ok";
    if (rate >= 0.7) return "rate-warn";
    return "rate-danger";
  }
</script>

<svelte:head><title>Cache — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Cache</h1>
        <p class="page-subtitle">Cache performance and key patterns in the last {period}</p>
      </div>
      <div class="period-selector">
        <PeriodSelect value={period} onchange={changePeriod} />
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="stat-grid">
      <div class="stat-card">
        <span class="stat-card-label">Hit Rate</span>
        <span class="stat-card-value {hitRateClass}">{hitRateDisplay}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Total Reads</span>
        <span class="stat-card-value">{totalReads.toLocaleString()}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Total Writes</span>
        <span class="stat-card-value">{totalWrites.toLocaleString()}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Total Deletes</span>
        <span class="stat-card-value">{totalDeletes.toLocaleString()}</span>
      </div>
    </div>

    <!-- Donut + Volume Charts -->
    <div class="charts-row">
      {#if (hits + misses) > 0}
        <div class="card chart-card-donut">
          <div class="card-header">
            <h2 class="card-title">Hits vs Misses</h2>
          </div>
          <div class="card-body card-body-center">
            <DonutChart
              segments={donutSegments}
              size={110}
              strokeWidth={12}
              centerValue={hitRateDisplay}
              centerLabel="hit rate"
            />
          </div>
        </div>
      {/if}
      {#if volume_series.length >= 2}
        <div class="card chart-card-volume">
          <div class="card-header">
            <h2 class="card-title">Cache Event Volume</h2>
            <span class="card-subtitle">Over time</span>
          </div>
          <div class="card-body">
            <AreaChart data={volume_series} width={420} height={80} color="#8b5cf6" />
          </div>
        </div>
      {/if}
    </div>

    <!-- Cache Patterns Table -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">Key Patterns</h2>
        <span class="card-subtitle">{patterns.length} patterns</span>
      </div>
      <div class="data-table">
        <div class="table-header">
          <div class="th" style="flex:3">Key Pattern</div>
          <div class="th th-right" style="width:5rem"><SortableHeader column="reads" label="Reads" /></div>
          <div class="th th-right" style="width:5rem"><SortableHeader column="writes" label="Writes" /></div>
          <div class="th th-right" style="width:5.5rem">Hit Rate</div>
          <div class="th th-right" style="width:5rem"><SortableHeader column="avg_duration" label="Avg" /></div>
        </div>
        {#each allPatterns as p, i (p.key_pattern + ':' + i)}
          <button class="table-row" onclick={() => openPattern(p)}>
            <div class="td td-key" style="flex:3">
              <span class="key-text">{p.key_pattern}</span>
            </div>
            <div class="td td-num" style="width:5rem">{p.reads}</div>
            <div class="td td-num" style="width:5rem">{p.writes}</div>
            <div class="td td-num" style="width:5.5rem">
              <span class={patternHitRateClass(p.hit_rate)}>{p.hit_rate != null ? `${(p.hit_rate * 100).toFixed(1)}%` : "\u2014"}</span>
            </div>
            <div class="td td-num" style="width:5rem">{fmt(p.avg_duration)}</div>
          </button>
        {/each}
        {#if allPatterns.length === 0}
          <div class="table-empty">
            <svg width="24" height="24" fill="none" stroke="#94a3b8" stroke-width="1.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>No cache events recorded in this period.</span>
          </div>
        {/if}
        <InfiniteScroll loading={loadingMore} hasMore={has_more} onLoadMore={loadMore} />
      </div>
    </div>
  </div>
</DaylightLayout>

<EwSheet bind:open={sheetOpen} title="Cache Pattern Detail" aiContext={sheetAi}>
  {#if sheetItem}
    <div class="sheet-detail">
      <dl class="dl">
        <div class="dl-row"><dt>Key Pattern</dt><dd class="mono">{sheetItem.key_pattern}</dd></div>
        <div class="dl-row"><dt>Reads</dt><dd>{sheetItem.reads}</dd></div>
        <div class="dl-row"><dt>Writes</dt><dd>{sheetItem.writes}</dd></div>
        <div class="dl-row"><dt>Hit Rate</dt><dd class={patternHitRateClass(sheetItem.hit_rate)}>{sheetItem.hit_rate != null ? `${(sheetItem.hit_rate * 100).toFixed(1)}%` : "\u2014"}</dd></div>
        <div class="dl-row"><dt>Avg Duration</dt><dd>{fmt(sheetItem.avg_duration)}</dd></div>
        {#if sheetItem.max_duration}<div class="dl-row"><dt>Max Duration</dt><dd>{fmt(sheetItem.max_duration)}</dd></div>{/if}
        {#if sheetItem.total}<div class="dl-row"><dt>Total Events</dt><dd>{sheetItem.total}</dd></div>{/if}
      </dl>
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
    color: var(--color-fg);
    margin: 0;
    letter-spacing: -0.025em;
  }

  .page-subtitle {
    font-size: 0.8125rem;
    color: var(--color-muted);
    margin: 0.25rem 0 0;
  }

  .period-selector {
    flex-shrink: 0;
  }

  /* Stat Cards */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
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

  .stat-card-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-muted);
  }

  .stat-card-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-fg);
    letter-spacing: -0.02em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .stat-ok { color: var(--color-success); }
  .stat-warn { color: var(--color-warning); }
  .stat-danger { color: var(--color-danger); }

  /* Charts Row */
  .charts-row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
  }

  .chart-card-donut {
    min-width: 280px;
  }

  .chart-card-volume {
    min-width: 0;
  }

  .card-body-center {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Cards */
  .card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .card-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  .card-title {
    font-size: 0.9375rem;
    font-weight: 650;
    color: var(--color-fg);
    margin: 0;
  }

  .card-subtitle {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .card-body {
    padding: 1.25rem;
  }

  /* Data Table */
  .data-table {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
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

  .th-right {
    text-align: right;
  }

  .table-row {
    display: flex;
    align-items: center;
    padding: 0 1rem;
    width: 100%;
    border: none;
    border-bottom: 1px solid var(--color-accent);
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
    background: var(--color-surface);
  }

  .td {
    padding: 0.625rem 0.5rem;
    font-size: 0.8125rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-fg);
  }

  .td-key {
    min-width: 0;
  }

  .key-text {
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
    font-size: 0.75rem;
    color: var(--color-fg-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  .td-num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    color: var(--color-fg-tertiary);
  }

  .rate-ok { color: var(--color-success); font-weight: 600; }
  .rate-warn { color: var(--color-warning); font-weight: 600; }
  .rate-danger { color: var(--color-danger); font-weight: 600; }

  .table-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2.5rem 1rem;
    color: var(--color-muted-light);
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
    border-bottom: 1px solid var(--color-accent);
    font-size: 0.8125rem;
  }

  .dl-row:last-child {
    border-bottom: none;
  }

  .dl-row dt {
    color: var(--color-muted);
    font-weight: 500;
  }

  .dl-row dd {
    color: var(--color-fg);
    font-weight: 500;
    margin: 0;
  }

  .mono {
    font-family: "SF Mono", Monaco, Menlo, Consolas, monospace;
    font-size: 0.75rem;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .stat-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .charts-row {
      grid-template-columns: 1fr;
    }
  }
</style>

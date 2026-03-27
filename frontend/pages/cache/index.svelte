<script>
  import { router } from "@inertiajs/svelte";
  import { fmt } from "@/lib/formatters.js";
  import DaylightLayout from "../DaylightLayout.svelte";
  import PeriodSelect from "../PeriodSelect.svelte";
  import EwSheet from "../errors/EwSheet.svelte";
  import SortableHeader from "@/components/ui/SortableHeader.svelte";
  import AreaChart from "@/components/charts/AreaChart.svelte";
  import DonutChart from "@/components/charts/DonutChart.svelte";
  import InfiniteScroll from "@/components/ui/InfiniteScroll.svelte";

  let { stats = {}, patterns = [], period = "24h", total_events = 0, volume_series = [], page = 1, has_more = false, base_path: base = "/daylight", sort_column = null, sort_direction = null } = $props();

  let sheetOpen = $state(false);
  let sheetItem = $state(null);

  function changePeriod(p) { router.get(`${base}/cache`, { period: p }, { preserveState: true }); }

  let hitRate = $derived(stats.hit_rate != null ? stats.hit_rate : 0);
  let hitRateDisplay = $derived(`${(hitRate * 100).toFixed(1)}%`);
  let hitRateClass = $derived(hitRate >= 0.9 ? "dl-stat-ok" : hitRate >= 0.7 ? "dl-stat-warn" : "dl-stat-danger");

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
  <div class="dl-page">
    <!-- Header -->
    <div class="dl-page-header">
      <div>
        <h1 class="dl-page-title">Cache</h1>
        <p class="dl-page-subtitle">Cache performance and key patterns in the last {period}</p>
      </div>
      <div class="dl-period-selector">
        <PeriodSelect value={period} onchange={changePeriod} />
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="dl-stat-grid">
      <div class="dl-stat-card">
        <span class="stat-card-label">Hit Rate</span>
        <span class="stat-card-value {hitRateClass}">{hitRateDisplay}</span>
      </div>
      <div class="dl-stat-card">
        <span class="stat-card-label">Total Reads</span>
        <span class="stat-card-value">{totalReads.toLocaleString()}</span>
      </div>
      <div class="dl-stat-card">
        <span class="stat-card-label">Total Writes</span>
        <span class="stat-card-value">{totalWrites.toLocaleString()}</span>
      </div>
      <div class="dl-stat-card">
        <span class="stat-card-label">Total Deletes</span>
        <span class="stat-card-value">{totalDeletes.toLocaleString()}</span>
      </div>
    </div>

    <!-- Donut + Volume Charts -->
    <div class="dl-charts-row">
      {#if (hits + misses) > 0}
        <div class="dl-card chart-card-donut">
          <div class="dl-card-header">
            <h2 class="dl-card-title">Hits vs Misses</h2>
          </div>
          <div class="dl-card-body card-body-center">
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
        <div class="dl-card chart-card-volume">
          <div class="dl-card-header">
            <h2 class="dl-card-title">Cache Event Volume</h2>
            <span class="dl-card-subtitle">Over time</span>
          </div>
          <div class="dl-card-body">
            <AreaChart data={volume_series} width={420} height={80} color="#8b5cf6" />
          </div>
        </div>
      {/if}
    </div>

    <!-- Cache Patterns Table -->
    <div class="dl-card">
      <div class="dl-card-header">
        <h2 class="dl-card-title">Key Patterns</h2>
        <span class="dl-card-subtitle">{patterns.length} patterns</span>
      </div>
      <div class="dl-data-table">
        <div class="dl-table-header">
          <div class="dl-th" style="flex:3">Key Pattern</div>
          <div class="dl-th dl-th-right" style="width:5rem"><SortableHeader column="reads" label="Reads" {sort_column} {sort_direction} /></div>
          <div class="dl-th dl-th-right" style="width:5rem"><SortableHeader column="writes" label="Writes" {sort_column} {sort_direction} /></div>
          <div class="dl-th dl-th-right" style="width:5.5rem">Hit Rate</div>
          <div class="dl-th dl-th-right" style="width:5rem"><SortableHeader column="avg_duration" label="Avg" {sort_column} {sort_direction} /></div>
        </div>
        {#each allPatterns as p, i (p.key_pattern + ':' + i)}
          <button class="dl-table-row" onclick={() => openPattern(p)}>
            <div class="dl-td td-key" style="flex:3">
              <span class="key-text">{p.key_pattern}</span>
            </div>
            <div class="dl-td dl-td-num" style="width:5rem">{p.reads}</div>
            <div class="dl-td dl-td-num" style="width:5rem">{p.writes}</div>
            <div class="dl-td dl-td-num" style="width:5.5rem">
              <span class={patternHitRateClass(p.hit_rate)}>{p.hit_rate != null ? `${(p.hit_rate * 100).toFixed(1)}%` : "\u2014"}</span>
            </div>
            <div class="dl-td dl-td-num" style="width:5rem">{fmt(p.avg_duration)}</div>
          </button>
        {/each}
        {#if allPatterns.length === 0}
          <div class="dl-table-empty">
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
    <div class="dl-sheet-detail">
      <dl class="dl-dl">
        <div class="dl-dl-row"><dt>Key Pattern</dt><dd class="dl-mono">{sheetItem.key_pattern}</dd></div>
        <div class="dl-dl-row"><dt>Reads</dt><dd>{sheetItem.reads}</dd></div>
        <div class="dl-dl-row"><dt>Writes</dt><dd>{sheetItem.writes}</dd></div>
        <div class="dl-dl-row"><dt>Hit Rate</dt><dd class={patternHitRateClass(sheetItem.hit_rate)}>{sheetItem.hit_rate != null ? `${(sheetItem.hit_rate * 100).toFixed(1)}%` : "\u2014"}</dd></div>
        <div class="dl-dl-row"><dt>Avg Duration</dt><dd>{fmt(sheetItem.avg_duration)}</dd></div>
        {#if sheetItem.max_duration}<div class="dl-dl-row"><dt>Max Duration</dt><dd>{fmt(sheetItem.max_duration)}</dd></div>{/if}
        {#if sheetItem.total}<div class="dl-dl-row"><dt>Total Events</dt><dd>{sheetItem.total}</dd></div>{/if}
      </dl>
    </div>
  {/if}
</EwSheet>

<style>
  /* Stat Card (page-specific, not yet in global CSS) */
  .dl-stat-card {
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

  /* Chart cards (page-specific sizing) */
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

  /* Table key column */
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

  /* Hit-rate coloring in table rows */
  .rate-ok { color: var(--color-success); font-weight: 600; }
  .rate-warn { color: var(--color-warning); font-weight: 600; }
  .rate-danger { color: var(--color-danger); font-weight: 600; }
</style>

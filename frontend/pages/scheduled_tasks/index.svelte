<script>
  import { router } from "@inertiajs/svelte";
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

  let { task_classes = [], failures = [], totals = {}, period = "24h", volume_series = [], failure_series = [], page = 1, has_more = false, base_path: base = "/daylight", sort_column = null, sort_direction = null } = $props();

  let sheetOpen = $state(false);
  let sheetItem = $state(null);
  let sheetType = $state("class");

  function changePeriod(p) { router.get(`${base}/scheduled_tasks`, { period: p }, { preserveState: true }); }
  function fmt(ms) { if (ms == null) return "—"; return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`; }
  function timeAgo(d) { if (!d) return ""; const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`; }
  function formatTime(d) { if (!d) return ""; return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }

  function openClass(tc) { sheetItem = tc; sheetType = "class"; sheetOpen = true; }
  function openFailure(f) { sheetItem = f; sheetType = "failure"; sheetOpen = true; }

  let sheetTitle = $derived(
    sheetType === "class" ? (sheetItem?.task_class || "Task") :
    `Failed: ${sheetItem?.task_class || "Task"}`
  );

  let sheetAi = $derived.by(() => {
    if (!sheetItem) return "";
    if (sheetType === "class") return `Task Class: ${sheetItem.task_class}\nTotal: ${sheetItem.total}\nCompleted: ${sheetItem.completed_count}\nFailed: ${sheetItem.failed_count}\nAvg duration: ${fmt(sheetItem.avg_duration)}\nMax duration: ${fmt(sheetItem.max_duration)}`;
    return `Failed Task: ${sheetItem.task_class}\nError: ${sheetItem.error_class}\nMessage: ${sheetItem.error_message}\nFailed at: ${sheetItem.occurred_at}`;
  });

  let avgDuration = $derived(task_classes.length > 0 ? task_classes.reduce((s, t) => s + (t.avg_duration || 0), 0) / task_classes.length : 0);

  let allTaskClasses = $state(task_classes);
  let currentPage = $state(page);
  let loadingMore = $state(false);

  $effect(() => {
    period;
    allTaskClasses = task_classes;
    currentPage = page;
  });

  function loadMore() {
    if (loadingMore || !has_more) return;
    loadingMore = true;
    router.get(`${base}/scheduled_tasks`, { period, page: currentPage + 1 }, {
      preserveState: true,
      preserveScroll: true,
      only: ['task_classes', 'page', 'has_more'],
      onSuccess: (p) => {
        const newItems = p.props.task_classes || [];
        allTaskClasses = [...allTaskClasses, ...newItems];
        currentPage = p.props.page;
        has_more = p.props.has_more;
        loadingMore = false;
      },
      onError: () => { loadingMore = false; }
    });
  }
</script>

<svelte:head><title>Scheduled Tasks — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="tasks-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Scheduled Tasks</h1>
        <p class="page-subtitle">Recurring task monitoring and performance</p>
      </div>
      <div class="header-controls">
        <ExportButton baseUrl={`${base}/scheduled_tasks/export`} />
        <PeriodSelect value={period} onchange={changePeriod} />
      </div>
    </div>

    <!-- Stat Cards -->
    <div class="stat-cards">
      <div class="stat-card">
        <span class="stat-card-label">Total Runs</span>
        <span class="stat-card-value">{totals.total || 0}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Completed</span>
        <span class="stat-card-value" style="color: #22c55e">{totals.completed || 0}</span>
      </div>
      <div class="stat-card {totals.failed > 0 ? 'stat-card-danger' : ''}">
        <span class="stat-card-label">Failed</span>
        <span class="stat-card-value">{totals.failed || 0}</span>
      </div>
      <div class="stat-card">
        <span class="stat-card-label">Avg Duration</span>
        <span class="stat-card-value">{fmt(avgDuration)}</span>
      </div>
    </div>

    <!-- Volume Time Series -->
    {#if volume_series.length > 0}
      <div class="chart-section">
        <TimeSeriesChart
          data={volume_series}
          width={720}
          height={180}
          color="#3b82f6"
          label="Task volume over time"
          showArea={true}
        />
        {#if failure_series.length > 0}
          <div style="margin-top: 0.75rem;">
            <TimeSeriesChart
              data={failure_series}
              width={720}
              height={100}
              color="#ef4444"
              label="Failures over time"
              showArea={true}
            />
          </div>
        {/if}
      </div>
    {/if}

    <!-- Task Classes Table -->
    {#if allTaskClasses.length > 0}
      <div class="section">
        <h2 class="section-title">Task Classes</h2>
        <div class="table-container">
          <div class="table-header">
            <div class="th" style="flex:2">Task Class</div>
            <div class="th r" style="width:4rem"><SortableHeader column="total" label="Total" {sort_column} {sort_direction} /></div>
            <div class="th r" style="width:4.5rem"><SortableHeader column="completed_count" label="Done" {sort_column} {sort_direction} /></div>
            <div class="th r" style="width:4rem"><SortableHeader column="failed_count" label="Failed" {sort_column} {sort_direction} /></div>
            <div class="th r" style="width:5rem"><SortableHeader column="avg_duration" label="Avg" {sort_column} {sort_direction} /></div>
            <div class="th r" style="width:5rem"><SortableHeader column="max_duration" label="Max" {sort_column} {sort_direction} /></div>
          </div>
          {#each allTaskClasses as tc, i (tc.task_class + ':' + i)}
            <button class="table-row" onclick={() => openClass(tc)}>
              <div class="td" style="flex:2"><span class="task-name">{tc.task_class}</span></div>
              <div class="td num" style="width:4rem">{tc.total}</div>
              <div class="td num completed" style="width:4.5rem">{tc.completed_count}</div>
              <div class="td num" style="width:4rem" class:failed-val={tc.failed_count > 0}>{tc.failed_count}</div>
              <div class="td num" style="width:5rem">{fmt(tc.avg_duration)}</div>
              <div class="td num" style="width:5rem" class:slow-val={tc.max_duration > 10000}>{fmt(tc.max_duration)}</div>
            </button>
          {/each}
          <InfiniteScroll loading={loadingMore} hasMore={has_more} onLoadMore={loadMore} />
        </div>
      </div>
    {/if}

    <!-- Failures -->
    {#if failures.length > 0}
      <div class="section">
        <div class="section-title-row">
          <h2 class="section-title">Recent Failures</h2>
          <span class="failure-count">{failures.length}</span>
        </div>
        <div class="table-container">
          <div class="table-header">
            <div class="th" style="flex:1.5">Task</div>
            <div class="th" style="flex:1">Error</div>
            <div class="th r" style="width:5.5rem">When</div>
          </div>
          {#each failures as f (f.id)}
            <button class="table-row failure-row" onclick={() => openFailure(f)}>
              <div class="td" style="flex:1.5">
                <span class="fail-task">{f.task_class || "Unknown"}</span>
              </div>
              <div class="td" style="flex:1">
                <span class="fail-error">{f.error_class || "—"}</span>
              </div>
              <div class="td r" style="width:5.5rem">
                <span class="fail-time">{timeAgo(f.occurred_at)}</span>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {:else if allTaskClasses.length === 0}
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <p class="empty-title">No scheduled task data yet</p>
        <p class="empty-sub">Tasks will appear here once they start running.</p>
      </div>
    {/if}
  </div>
</DaylightLayout>

<EwSheet bind:open={sheetOpen} title={sheetTitle} aiContext={sheetAi}>
  {#if sheetItem}
    <div class="sheet-detail">
      {#if sheetType === "class"}
        <dl class="dl">
          <div class="dl-row"><dt>Task Class</dt><dd>{sheetItem.task_class}</dd></div>
          <div class="dl-row"><dt>Total</dt><dd>{sheetItem.total}</dd></div>
          <div class="dl-row"><dt>Completed</dt><dd class="ok">{sheetItem.completed_count}</dd></div>
          <div class="dl-row"><dt>Failed</dt><dd class:err={sheetItem.failed_count > 0}>{sheetItem.failed_count}</dd></div>
          <div class="dl-row"><dt>Avg Duration</dt><dd>{fmt(sheetItem.avg_duration)}</dd></div>
          <div class="dl-row"><dt>Max Duration</dt><dd class:slow={sheetItem.max_duration > 10000}>{fmt(sheetItem.max_duration)}</dd></div>
        </dl>

      {:else}
        <dl class="dl">
          <div class="dl-row"><dt>Task Class</dt><dd>{sheetItem.task_class}</dd></div>
          {#if sheetItem.duration_ms}<div class="dl-row"><dt>Duration</dt><dd>{fmt(sheetItem.duration_ms)}</dd></div>{/if}
          <div class="dl-row"><dt>Failed At</dt><dd>{formatTime(sheetItem.occurred_at)}</dd></div>
          <div class="dl-row"><dt>Error Class</dt><dd class="err">{sheetItem.error_class || "—"}</dd></div>
        </dl>
        {#if sheetItem.error_message}
          <h4 class="sheet-sub">Error Message</h4>
          <pre class="sheet-pre">{sheetItem.error_message}</pre>
        {/if}
      {/if}
    </div>
  {/if}
</EwSheet>

<style>
  /* Page layout */
  .tasks-page { display: flex; flex-direction: column; gap: 1.5rem; }

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
  .section-title-row { display: flex; align-items: center; gap: 0.5rem; }
  .failure-count {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--color-danger);
    background: var(--color-danger-subtle);
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-variant-numeric: tabular-nums;
  }

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
  .completed { color: var(--color-success); }
  .failed-val { color: var(--color-danger); font-weight: 600; }
  .slow-val { color: var(--color-danger); font-weight: 600; }
  .task-name { font-size: 0.8125rem; font-weight: 600; color: var(--color-fg); }

  /* Failure rows */
  .failure-row { border-left: 2px solid transparent; }
  .failure-row:hover { border-left-color: var(--color-danger); }
  .fail-task { font-size: 0.8125rem; font-weight: 600; color: var(--color-fg); }
  .fail-error { font-size: 0.75rem; color: var(--color-danger); font-weight: 500; }
  .fail-time { font-size: 0.75rem; color: var(--color-muted-light); font-variant-numeric: tabular-nums; }

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
  .slow { color: var(--color-danger); font-weight: 600; }
  .sheet-sub { font-size: 0.6875rem; font-weight: 600; color: var(--color-muted-light); text-transform: uppercase; letter-spacing: 0.04em; margin: 0; }
  .sheet-pre { font-size: 0.6875rem; font-family: "SF Mono", Monaco, Menlo, monospace; background: var(--color-danger-subtle); padding: 0.75rem; border: 1px solid var(--color-danger-border); border-radius: 0.5rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; color: var(--color-danger); line-height: 1.6; }

  /* Responsive */
  @media (max-width: 768px) {
    .stat-cards { grid-template-columns: repeat(2, 1fr); }
  }
</style>

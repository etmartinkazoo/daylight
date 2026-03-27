<script>
  import { router } from "@inertiajs/svelte";
  import { fmt, timeAgo, formatTime } from "@/lib/formatters.js";
  import DaylightLayout from "../DaylightLayout.svelte";
  import Badge from "@/components/ui/Badge.svelte";
  import Button from "@/components/ui/Button.svelte";
  import Table from "@/components/ui/Table.svelte";
  import SortableHeader from "@/components/ui/SortableHeader.svelte";
  import PeriodSelect from "../PeriodSelect.svelte";
  import EwSheet from "../errors/EwSheet.svelte";
  import DonutChart from "@/components/charts/DonutChart.svelte";
  import TimeSeriesChart from "@/components/charts/TimeSeriesChart.svelte";
  import InteractiveBarChart from "@/components/charts/InteractiveBarChart.svelte";
  import ExportButton from "@/components/ui/ExportButton.svelte";
  import InfiniteScroll from "@/components/ui/InfiniteScroll.svelte";

  let { job_classes = [], failures = [], period = "24h", totals = {}, solid_queue = null, volume_series = [], failure_series = [], page = 1, has_more = false, base_path: base = "/daylight", sort_column = null, sort_direction = null } = $props();

  let sheetOpen = $state(false);
  let sheetItem = $state(null);
  let sheetType = $state("class");

  function changePeriod(p) { router.get(`${base}/jobs`, { period: p }, { preserveState: true }); }

  function openClass(jc) { sheetItem = jc; sheetType = "class"; sheetOpen = true; }
  function openFailure(f) { sheetItem = f; sheetType = "failure"; sheetOpen = true; }

  function openSqStat(label, items) {
    sheetItem = { label, items };
    sheetType = "sq_stat";
    sheetOpen = true;
  }

  let sheetTitle = $derived(
    sheetType === "sq_stat" ? (sheetItem?.label || "Jobs") :
    sheetType === "class" ? (sheetItem?.job_class || "Job") :
    `Failed: ${sheetItem?.job_class || "Job"}`
  );

  let sheetAi = $derived.by(() => {
    if (!sheetItem) return "";
    if (sheetType === "class") return `Job Class: ${sheetItem.job_class}\nTotal: ${sheetItem.total}\nCompleted: ${sheetItem.completed_count}\nFailed: ${sheetItem.failed_count}\nQueued: ${sheetItem.queued_count}\nAvg duration: ${fmt(sheetItem.avg_duration)}\nMax duration: ${fmt(sheetItem.max_duration)}`;
    if (sheetType === "failure") return `Failed Job: ${sheetItem.job_class}\nQueue: ${sheetItem.queue || "default"}\nError: ${sheetItem.error_class}\nMessage: ${sheetItem.error_message}\nFailed at: ${sheetItem.occurred_at}`;
    return `${sheetItem.label}: ${sheetItem.items?.length || 0} items`;
  });

  let avgDuration = $derived(job_classes.length > 0 ? job_classes.reduce((s, j) => s + (j.avg_duration || 0), 0) / job_classes.length : 0);

  let donutSegments = $derived([
    { value: totals.completed || 0, color: "#22c55e", label: "Completed" },
    { value: totals.failed || 0, color: "#ef4444", label: "Failed" },
    { value: (totals.total || 0) - (totals.completed || 0) - (totals.failed || 0), color: "#3b82f6", label: "Other" },
  ].filter(s => s.value > 0));

  let completionPct = $derived(totals.total > 0 ? Math.round(((totals.completed || 0) / totals.total) * 100) : 0);

  let allJobClasses = $state(job_classes);
  let currentPage = $state(page);
  let loadingMore = $state(false);

  $effect(() => {
    period;
    allJobClasses = job_classes;
    currentPage = page;
  });

  function loadMore() {
    if (loadingMore || !has_more) return;
    loadingMore = true;
    router.get(`${base}/jobs`, { period, page: currentPage + 1 }, {
      preserveState: true,
      preserveScroll: true,
      only: ['job_classes', 'page', 'has_more'],
      onSuccess: (p) => {
        const newItems = p.props.job_classes || [];
        allJobClasses = [...allJobClasses, ...newItems];
        currentPage = p.props.page;
        has_more = p.props.has_more;
        loadingMore = false;
      },
      onError: () => { loadingMore = false; }
    });
  }
</script>

<svelte:head><title>Jobs — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="dl-page">
    <div class="dl-page-header">
      <div>
        <h1 class="dl-page-title">Jobs</h1>
        <p class="dl-page-subtitle">Background job monitoring and performance</p>
      </div>
      <div class="header-controls">
        <ExportButton baseUrl={`${base}/jobs/export`} />
        <PeriodSelect value={period} onchange={changePeriod} />
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-cards">
        <div class="stat-card"><span class="stat-card-label">Total Jobs</span><span class="stat-card-value">{totals.total || 0}</span></div>
        <div class="stat-card"><span class="stat-card-label">Completed</span><span class="stat-card-value" style="color:#22c55e">{totals.completed || 0}</span></div>
        <div class="stat-card {totals.failed > 0 ? 'stat-card-danger' : ''}"><span class="stat-card-label">Failed</span><span class="stat-card-value">{totals.failed || 0}</span></div>
        <div class="stat-card"><span class="stat-card-label">Avg Duration</span><span class="stat-card-value">{fmt(avgDuration)}</span></div>
      </div>
      {#if (totals.total || 0) > 0}
        <div class="chart-card">
          <DonutChart segments={donutSegments} size={110} strokeWidth={12} centerValue="{completionPct}%" centerLabel="complete" />
        </div>
      {/if}
    </div>

    {#if volume_series.length > 0}
      {@const jobChartData = volume_series.map((d, i) => ({ t: d.t, total: d.v, failed: failure_series[i]?.v || 0 }))}
      <InteractiveBarChart data={jobChartData} series={[{ key: "total", label: "Total Jobs", color: "#3b82f6" }, { key: "failed", label: "Failed", color: "#ef4444" }]} title="Job Volume" description="Job execution over time" height={250} />
    {/if}

    {#if solid_queue}
      <div class="section">
        <h2 class="section-title">Solid Queue</h2>
        <div class="sq-cards">
          <button class="sq-card" onclick={() => openSqStat("Ready Jobs", solid_queue.ready_jobs)}><span class="sq-card-value">{solid_queue.ready}</span><span class="sq-card-label">Ready</span></button>
          <button class="sq-card" onclick={() => openSqStat("Scheduled Jobs", solid_queue.scheduled_jobs)}><span class="sq-card-value">{solid_queue.scheduled}</span><span class="sq-card-label">Scheduled</span></button>
          <button class="sq-card" onclick={() => openSqStat("Running Jobs", solid_queue.claimed_jobs)}><span class="sq-card-value">{solid_queue.claimed}</span><span class="sq-card-label">Running</span></button>
          <button class="sq-card {solid_queue.failed > 0 ? 'sq-card-danger' : ''}" onclick={() => {}}><span class="sq-card-value">{solid_queue.failed}</span><span class="sq-card-label">Failed</span></button>
          <button class="sq-card" onclick={() => openSqStat("Worker Processes", solid_queue.worker_processes)}><span class="sq-card-value">{solid_queue.processes}</span><span class="sq-card-label">Workers</span></button>
        </div>
      </div>
    {/if}

    {#if allJobClasses.length > 0}
      <div class="section">
        <h2 class="section-title">Job Classes</h2>
        <div class="dl-data-table">
          <div class="dl-table-header">
            <div class="dl-th" style="flex:2">Job Class</div>
            <div class="dl-th dl-th-right" style="width:4rem"><SortableHeader column="total" label="Total" {sort_column} {sort_direction} /></div>
            <div class="dl-th dl-th-right" style="width:4.5rem"><SortableHeader column="completed_count" label="Done" {sort_column} {sort_direction} /></div>
            <div class="dl-th dl-th-right" style="width:4rem"><SortableHeader column="failed_count" label="Failed" {sort_column} {sort_direction} /></div>
            <div class="dl-th dl-th-right" style="width:4.5rem">Queued</div>
            <div class="dl-th dl-th-right" style="width:5rem"><SortableHeader column="avg_duration" label="Avg" {sort_column} {sort_direction} /></div>
            <div class="dl-th dl-th-right" style="width:5rem"><SortableHeader column="max_duration" label="Max" {sort_column} {sort_direction} /></div>
          </div>
          {#each allJobClasses as jc, i (jc.job_class + ':' + i)}
            <button class="dl-table-row" onclick={() => openClass(jc)}>
              <div class="dl-td" style="flex:2"><span class="job-name">{jc.job_class}</span></div>
              <div class="dl-td dl-td-num" style="width:4rem">{jc.total}</div>
              <div class="dl-td dl-td-num completed" style="width:4.5rem">{jc.completed_count}</div>
              <div class="dl-td dl-td-num" style="width:4rem" class:failed-val={jc.failed_count > 0}>{jc.failed_count}</div>
              <div class="dl-td dl-td-num" style="width:4.5rem">{jc.queued_count}</div>
              <div class="dl-td dl-td-num" style="width:5rem">{fmt(jc.avg_duration)}</div>
              <div class="dl-td dl-td-num" style="width:5rem" class:slow-val={jc.max_duration > 10000}>{fmt(jc.max_duration)}</div>
            </button>
          {/each}
          <InfiniteScroll loading={loadingMore} hasMore={has_more} onLoadMore={loadMore} />
        </div>
      </div>
    {/if}

    {#if failures.length > 0}
      <div class="section">
        <div class="section-title-row">
          <h2 class="section-title">Recent Failures</h2>
          <span class="failure-count">{failures.length}</span>
        </div>
        <div class="dl-data-table">
          <div class="dl-table-header">
            <div class="dl-th" style="flex:1.5">Job</div>
            <div class="dl-th" style="flex:1">Error</div>
            <div class="dl-th" style="width:5rem">Queue</div>
            <div class="dl-th dl-th-right" style="width:5.5rem">When</div>
          </div>
          {#each failures as f (f.id)}
            <button class="dl-table-row failure-row" onclick={() => openFailure(f)}>
              <div class="dl-td" style="flex:1.5"><span class="fail-job">{f.job_class || "Unknown"}</span></div>
              <div class="dl-td" style="flex:1"><span class="fail-error">{f.error_class || "—"}</span></div>
              <div class="dl-td" style="width:5rem"><span class="fail-queue-badge">{f.queue || "—"}</span></div>
              <div class="dl-td dl-th-right" style="width:5.5rem"><span class="fail-time">{timeAgo(f.occurred_at)}</span></div>
            </button>
          {/each}
        </div>
      </div>
    {:else if allJobClasses.length === 0}
      <div class="dl-table-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        <p>No job data yet</p>
        <p>Jobs will appear here once they start running.</p>
      </div>
    {/if}
  </div>
</DaylightLayout>

<EwSheet bind:open={sheetOpen} title={sheetTitle} aiContext={sheetAi}>
  {#if sheetItem}
    <div class="dl-sheet-detail">
      {#if sheetType === "sq_stat"}
        <p class="sheet-count">{sheetItem.items?.length || 0} item{sheetItem.items?.length === 1 ? "" : "s"}</p>
        {#if sheetItem.items?.length > 0}
          <div class="sq-list">
            {#each sheetItem.items as item (item.id)}
              <div class="sq-list-row">
                <span class="sq-list-class">{item.job_class || item.kind || "—"}</span>
                {#if item.queue}<span class="sq-list-queue">{item.queue}</span>{/if}
                {#if item.hostname}<span class="sq-list-host">{item.hostname}:{item.pid}</span>{/if}
                {#if item.scheduled_at}<span class="sq-list-time">{formatTime(item.scheduled_at)}</span>
                {:else if item.claimed_at}<span class="sq-list-time">{formatTime(item.claimed_at)}</span>
                {:else if item.last_heartbeat_at}<span class="sq-list-time">heartbeat: {timeAgo(item.last_heartbeat_at)}</span>
                {:else if item.created_at}<span class="sq-list-time">{formatTime(item.created_at)}</span>
                {/if}
              </div>
            {/each}
          </div>
        {:else}
          <p class="sheet-empty">No items</p>
        {/if}

      {:else if sheetType === "class"}
        <dl class="dl-dl">
          <div class="dl-dl-row"><dt>Job Class</dt><dd>{sheetItem.job_class}</dd></div>
          <div class="dl-dl-row"><dt>Total</dt><dd>{sheetItem.total}</dd></div>
          <div class="dl-dl-row"><dt>Completed</dt><dd class="ok">{sheetItem.completed_count}</dd></div>
          <div class="dl-dl-row"><dt>Failed</dt><dd class:err={sheetItem.failed_count > 0}>{sheetItem.failed_count}</dd></div>
          <div class="dl-dl-row"><dt>Queued</dt><dd>{sheetItem.queued_count}</dd></div>
          <div class="dl-dl-row"><dt>Avg Duration</dt><dd>{fmt(sheetItem.avg_duration)}</dd></div>
          <div class="dl-dl-row"><dt>Max Duration</dt><dd class:slow={sheetItem.max_duration > 10000}>{fmt(sheetItem.max_duration)}</dd></div>
        </dl>

      {:else}
        <dl class="dl-dl">
          <div class="dl-dl-row"><dt>Job Class</dt><dd>{sheetItem.job_class}</dd></div>
          <div class="dl-dl-row"><dt>Queue</dt><dd>{sheetItem.queue || "—"}</dd></div>
          {#if sheetItem.duration_ms}<div class="dl-dl-row"><dt>Duration</dt><dd>{fmt(sheetItem.duration_ms)}</dd></div>{/if}
          <div class="dl-dl-row"><dt>Failed At</dt><dd>{formatTime(sheetItem.occurred_at)}</dd></div>
          <div class="dl-dl-row"><dt>Error Class</dt><dd class="err">{sheetItem.error_class || "—"}</dd></div>
          <div class="dl-dl-row"><dt>Source</dt><dd class="source-badge">{sheetItem.source === "solid_queue" ? "Solid Queue" : "Daylight"}</dd></div>
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
  .header-controls { display: flex; align-items: center; gap: 0.5rem; }
  .section { display: flex; flex-direction: column; gap: 0.75rem; }
  .section-title { font-size: 0.875rem; font-weight: 600; color: var(--color-fg); margin: 0; }
  .section-title-row { display: flex; align-items: center; gap: 0.5rem; }
  .failure-count { font-size: 0.6875rem; font-weight: 600; color: var(--color-danger); background: var(--color-danger-subtle); padding: 0.125rem 0.5rem; border-radius: 9999px; font-variant-numeric: tabular-nums; }
  .stats-row { display: flex; gap: 1rem; align-items: flex-start; }
  .stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; flex: 1; }
  .stat-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; }
  .stat-card-label { font-size: 0.8125rem; font-weight: 500; color: var(--color-muted); }
  .stat-card-value { font-size: 1.75rem; font-weight: 700; color: var(--color-fg); letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; }
  .stat-card-danger { border-color: var(--color-danger-border); background: var(--color-danger-bg); }
  .stat-card-danger .stat-card-value { color: var(--color-danger); }
  .chart-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1.25rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sq-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; }
  .sq-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.25rem; cursor: pointer; transition: all 0.15s ease; font-family: inherit; }
  .sq-card:hover { border-color: var(--color-muted-lightest); box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); }
  .sq-card-value { font-size: 1.25rem; font-weight: 700; color: var(--color-fg); font-variant-numeric: tabular-nums; line-height: 1; }
  .sq-card-label { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-muted); }
  .sq-card-danger { border-color: var(--color-danger-border); background: var(--color-danger-bg); }
  .sq-card-danger .sq-card-value { color: var(--color-danger); }
  .job-name { font-size: 0.8125rem; font-weight: 600; color: var(--color-fg); }
  .completed { color: var(--color-success); }
  .failed-val, .slow-val, .err, .slow { color: var(--color-danger); font-weight: 600; }
  .ok { color: var(--color-success); }
  .failure-row { border-left: 2px solid transparent; }
  .failure-row:hover { border-left-color: var(--color-danger); }
  .fail-job { font-size: 0.8125rem; font-weight: 600; color: var(--color-fg); }
  .fail-error { font-size: 0.75rem; color: var(--color-danger); font-weight: 500; }
  .fail-queue-badge, .source-badge, .sq-list-queue { font-size: 0.6875rem; color: var(--color-muted); background: var(--color-accent); padding: 0.125rem 0.5rem; border-radius: 0.25rem; }
  .fail-time { font-size: 0.75rem; color: var(--color-muted-light); font-variant-numeric: tabular-nums; }
  .sheet-sub { font-size: 0.6875rem; font-weight: 600; color: var(--color-muted-light); text-transform: uppercase; letter-spacing: 0.04em; margin: 0; }
  .sheet-pre { font-size: 0.6875rem; font-family: "SF Mono", Monaco, Menlo, monospace; background: var(--color-danger-subtle); padding: 0.75rem; border: 1px solid var(--color-danger-border); border-radius: 0.5rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; color: var(--color-danger); line-height: 1.6; }
  .sheet-count, .sheet-empty { font-size: 0.8125rem; margin: 0; }
  .sheet-count { color: var(--color-muted); }
  .sheet-empty { color: var(--color-muted-light); }
  .sq-list { display: flex; flex-direction: column; border: 1px solid var(--color-border); border-radius: 0.5rem; overflow: hidden; }
  .sq-list-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--color-accent); font-size: 0.8125rem; flex-wrap: wrap; }
  .sq-list-row:last-child { border-bottom: none; }
  .sq-list-class { font-weight: 600; color: var(--color-fg); }
  .sq-list-host { font-size: 0.6875rem; color: var(--color-muted); font-family: monospace; }
  .sq-list-time { font-size: 0.6875rem; color: var(--color-muted-light); margin-left: auto; }
  @media (max-width: 768px) {
    .stat-cards { grid-template-columns: repeat(2, 1fr); }
    .stats-row { flex-direction: column; }
    .sq-cards { grid-template-columns: repeat(3, 1fr); }
  }
</style>

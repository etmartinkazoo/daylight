<script>
  import { router, usePage } from "@inertiajs/svelte";
  import DaylightLayout from "./DaylightLayout.svelte";
  import Badge from "@/components/ui/Badge.svelte";
  import Button from "@/components/ui/Button.svelte";
  import Table from "@/components/ui/Table.svelte";
  import SortableHeader from "@/components/ui/SortableHeader.svelte";
  import PeriodSelect from "./PeriodSelect.svelte";
  import EwSheet from "./EwSheet.svelte";
  import DonutChart from "@/components/charts/DonutChart.svelte";
  import TimeSeriesChart from "@/components/charts/TimeSeriesChart.svelte";
  import ExportButton from "@/components/ui/ExportButton.svelte";

  let { job_classes = [], failures = [], period = "24h", totals = {}, solid_queue = null, volume_series = [], failure_series = [] } = $props();
  const pageStore = usePage();
  let base = $derived($pageStore.props?.base_path || "/daylight");

  let sheetOpen = $state(false);
  let sheetItem = $state(null);
  let sheetType = $state("class");

  function changePeriod(p) { router.get(`${base}/jobs`, { period: p }, { preserveState: true }); }
  function fmt(ms) { if (ms == null) return "—"; return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`; }
  function timeAgo(d) { if (!d) return ""; const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return `${m}m`; const h = Math.floor(m / 60); return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`; }
  function formatTime(d) { if (!d) return ""; return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }

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
</script>

<svelte:head><title>Jobs — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="jobs-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Jobs</h1>
        <p class="page-subtitle">Background job monitoring and performance</p>
      </div>
      <div class="header-controls">
        <ExportButton baseUrl={`${base}/jobs/export`} />
        <PeriodSelect value={period} onchange={changePeriod} />
      </div>
    </div>

    <!-- Stat Cards + Donut Chart -->
    <div class="stats-row">
      <div class="stat-cards">
        <div class="stat-card">
          <span class="stat-card-label">Total Jobs</span>
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
      {#if (totals.total || 0) > 0}
        <div class="chart-card">
          <DonutChart
            segments={donutSegments}
            size={110}
            strokeWidth={12}
            centerValue="{completionPct}%"
            centerLabel="complete"
          />
        </div>
      {/if}
    </div>

    <!-- Job Volume Time Series -->
    {#if volume_series.length > 0}
      <div class="chart-section">
        <TimeSeriesChart
          data={volume_series}
          width={720}
          height={180}
          color="#3b82f6"
          label="Job volume over time"
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

    <!-- Solid Queue Status -->
    {#if solid_queue}
      <div class="section">
        <h2 class="section-title">Solid Queue</h2>
        <div class="sq-cards">
          <button class="sq-card" onclick={() => openSqStat("Ready Jobs", solid_queue.ready_jobs)}>
            <span class="sq-card-value">{solid_queue.ready}</span>
            <span class="sq-card-label">Ready</span>
          </button>
          <button class="sq-card" onclick={() => openSqStat("Scheduled Jobs", solid_queue.scheduled_jobs)}>
            <span class="sq-card-value">{solid_queue.scheduled}</span>
            <span class="sq-card-label">Scheduled</span>
          </button>
          <button class="sq-card" onclick={() => openSqStat("Running Jobs", solid_queue.claimed_jobs)}>
            <span class="sq-card-value">{solid_queue.claimed}</span>
            <span class="sq-card-label">Running</span>
          </button>
          <button class="sq-card {solid_queue.failed > 0 ? 'sq-card-danger' : ''}" onclick={() => { /* failures shown below */ }}>
            <span class="sq-card-value">{solid_queue.failed}</span>
            <span class="sq-card-label">Failed</span>
          </button>
          <button class="sq-card" onclick={() => openSqStat("Worker Processes", solid_queue.worker_processes)}>
            <span class="sq-card-value">{solid_queue.processes}</span>
            <span class="sq-card-label">Workers</span>
          </button>
        </div>
      </div>
    {/if}

    <!-- Job Classes Table -->
    {#if job_classes.length > 0}
      <div class="section">
        <h2 class="section-title">Job Classes</h2>
        <div class="table-container">
          <div class="table-header">
            <div class="th" style="flex:2">Job Class</div>
            <div class="th r" style="width:4rem"><SortableHeader column="total" label="Total" /></div>
            <div class="th r" style="width:4.5rem"><SortableHeader column="completed_count" label="Done" /></div>
            <div class="th r" style="width:4rem"><SortableHeader column="failed_count" label="Failed" /></div>
            <div class="th r" style="width:4.5rem">Queued</div>
            <div class="th r" style="width:5rem"><SortableHeader column="avg_duration" label="Avg" /></div>
            <div class="th r" style="width:5rem"><SortableHeader column="max_duration" label="Max" /></div>
          </div>
          {#each job_classes as jc (jc.job_class)}
            <button class="table-row" onclick={() => openClass(jc)}>
              <div class="td" style="flex:2"><span class="job-name">{jc.job_class}</span></div>
              <div class="td num" style="width:4rem">{jc.total}</div>
              <div class="td num completed" style="width:4.5rem">{jc.completed_count}</div>
              <div class="td num" style="width:4rem" class:failed-val={jc.failed_count > 0}>{jc.failed_count}</div>
              <div class="td num" style="width:4.5rem">{jc.queued_count}</div>
              <div class="td num" style="width:5rem">{fmt(jc.avg_duration)}</div>
              <div class="td num" style="width:5rem" class:slow-val={jc.max_duration > 10000}>{fmt(jc.max_duration)}</div>
            </button>
          {/each}
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
            <div class="th" style="flex:1.5">Job</div>
            <div class="th" style="flex:1">Error</div>
            <div class="th" style="width:5rem">Queue</div>
            <div class="th r" style="width:5.5rem">When</div>
          </div>
          {#each failures as f (f.id)}
            <button class="table-row failure-row" onclick={() => openFailure(f)}>
              <div class="td" style="flex:1.5">
                <span class="fail-job">{f.job_class || "Unknown"}</span>
              </div>
              <div class="td" style="flex:1">
                <span class="fail-error">{f.error_class || "—"}</span>
              </div>
              <div class="td" style="width:5rem">
                <span class="fail-queue-badge">{f.queue || "—"}</span>
              </div>
              <div class="td r" style="width:5.5rem">
                <span class="fail-time">{timeAgo(f.occurred_at)}</span>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {:else if job_classes.length === 0}
      <div class="empty-state">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
        </div>
        <p class="empty-title">No job data yet</p>
        <p class="empty-sub">Jobs will appear here once they start running.</p>
      </div>
    {/if}
  </div>
</DaylightLayout>

<EwSheet bind:open={sheetOpen} title={sheetTitle} aiContext={sheetAi}>
  {#if sheetItem}
    <div class="sheet-detail">
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
        <dl class="dl">
          <div class="dl-row"><dt>Job Class</dt><dd>{sheetItem.job_class}</dd></div>
          <div class="dl-row"><dt>Total</dt><dd>{sheetItem.total}</dd></div>
          <div class="dl-row"><dt>Completed</dt><dd class="ok">{sheetItem.completed_count}</dd></div>
          <div class="dl-row"><dt>Failed</dt><dd class:err={sheetItem.failed_count > 0}>{sheetItem.failed_count}</dd></div>
          <div class="dl-row"><dt>Queued</dt><dd>{sheetItem.queued_count}</dd></div>
          <div class="dl-row"><dt>Avg Duration</dt><dd>{fmt(sheetItem.avg_duration)}</dd></div>
          <div class="dl-row"><dt>Max Duration</dt><dd class:slow={sheetItem.max_duration > 10000}>{fmt(sheetItem.max_duration)}</dd></div>
        </dl>

      {:else}
        <dl class="dl">
          <div class="dl-row"><dt>Job Class</dt><dd>{sheetItem.job_class}</dd></div>
          <div class="dl-row"><dt>Queue</dt><dd>{sheetItem.queue || "—"}</dd></div>
          {#if sheetItem.duration_ms}<div class="dl-row"><dt>Duration</dt><dd>{fmt(sheetItem.duration_ms)}</dd></div>{/if}
          <div class="dl-row"><dt>Failed At</dt><dd>{formatTime(sheetItem.occurred_at)}</dd></div>
          <div class="dl-row"><dt>Error Class</dt><dd class="err">{sheetItem.error_class || "—"}</dd></div>
          <div class="dl-row"><dt>Source</dt><dd class="source-badge">{sheetItem.source === "solid_queue" ? "Solid Queue" : "Daylight"}</dd></div>
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
  .jobs-page { display: flex; flex-direction: column; gap: 1.5rem; }

  .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .page-title { font-size: 1.375rem; font-weight: 700; color: #0f172a; margin: 0; letter-spacing: -0.02em; }
  .page-subtitle { font-size: 0.8125rem; color: #64748b; margin: 0.25rem 0 0; }
  .header-controls { display: flex; align-items: center; gap: 0.5rem; }
  .chart-section {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.25rem;
  }

  .section { display: flex; flex-direction: column; gap: 0.75rem; }
  .section-title { font-size: 0.875rem; font-weight: 600; color: #0f172a; margin: 0; }
  .section-title-row { display: flex; align-items: center; gap: 0.5rem; }
  .failure-count {
    font-size: 0.6875rem;
    font-weight: 600;
    color: #ef4444;
    background: #fef2f2;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    font-variant-numeric: tabular-nums;
  }

  /* Stat Cards */
  .stats-row { display: flex; gap: 1rem; align-items: flex-start; }
  .stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; flex: 1; }
  .stat-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .stat-card-label { font-size: 0.8125rem; font-weight: 500; color: #64748b; }
  .stat-card-value { font-size: 1.75rem; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; }
  .stat-card-danger { border-color: #fecaca; background: #fff5f5; }
  .stat-card-danger .stat-card-value { color: #ef4444; }

  .chart-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  /* Solid Queue Cards */
  .sq-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.75rem; }
  .sq-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    transition: all 0.15s ease;
    font-family: inherit;
  }
  .sq-card:hover { border-color: #cbd5e1; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); }
  .sq-card-value { font-size: 1.25rem; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; line-height: 1; }
  .sq-card-label { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; }
  .sq-card-danger { border-color: #fecaca; background: #fff5f5; }
  .sq-card-danger .sq-card-value { color: #ef4444; }

  /* Tables */
  .table-container {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
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
  .r { text-align: right; }
  .table-row {
    display: flex;
    align-items: center;
    padding: 0 1rem;
    border-bottom: 1px solid #f1f5f9;
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
  .table-row:hover { background: #f8fafc; }
  .td {
    padding: 0.5625rem 0.5rem;
    font-size: 0.8125rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #334155;
  }
  .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
  .completed { color: #22c55e; }
  .failed-val { color: #ef4444; font-weight: 600; }
  .slow-val { color: #ef4444; font-weight: 600; }
  .job-name { font-size: 0.8125rem; font-weight: 600; color: #0f172a; }

  /* Failure rows */
  .failure-row { border-left: 2px solid transparent; }
  .failure-row:hover { border-left-color: #ef4444; }
  .fail-job { font-size: 0.8125rem; font-weight: 600; color: #0f172a; }
  .fail-error { font-size: 0.75rem; color: #ef4444; font-weight: 500; }
  .fail-queue-badge {
    font-size: 0.6875rem;
    color: #64748b;
    background: #f1f5f9;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
  }
  .fail-time { font-size: 0.75rem; color: #94a3b8; font-variant-numeric: tabular-nums; }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    text-align: center;
  }
  .empty-icon { margin-bottom: 1rem; }
  .empty-title { font-size: 0.9375rem; font-weight: 600; color: #0f172a; margin: 0; }
  .empty-sub { font-size: 0.8125rem; color: #94a3b8; margin: 0.25rem 0 0; }

  /* Sheet styles */
  .sheet-detail { display: flex; flex-direction: column; gap: 1rem; }
  .dl { display: flex; flex-direction: column; margin: 0; }
  .dl-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; font-size: 0.8125rem; }
  .dl-row:last-child { border-bottom: none; }
  .dl-row dt { color: #64748b; font-weight: 500; }
  .dl-row dd { color: #0f172a; font-weight: 500; margin: 0; }
  .ok { color: #22c55e; }
  .err { color: #ef4444; font-weight: 600; }
  .slow { color: #ef4444; font-weight: 600; }
  .source-badge { font-size: 0.6875rem; padding: 0.125rem 0.5rem; background: #f1f5f9; color: #64748b; border-radius: 0.25rem; }
  .sheet-sub { font-size: 0.6875rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; margin: 0; }
  .sheet-pre { font-size: 0.6875rem; font-family: "SF Mono", Monaco, Menlo, monospace; background: #fef2f2; padding: 0.75rem; border: 1px solid #fecaca; border-radius: 0.5rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; color: #ef4444; line-height: 1.6; }
  .sheet-count { font-size: 0.8125rem; color: #64748b; margin: 0; }
  .sheet-empty { font-size: 0.8125rem; color: #94a3b8; margin: 0; }

  .sq-list { display: flex; flex-direction: column; border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; }
  .sq-list-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid #f1f5f9; font-size: 0.8125rem; flex-wrap: wrap; }
  .sq-list-row:last-child { border-bottom: none; }
  .sq-list-class { font-weight: 600; color: #0f172a; }
  .sq-list-queue { font-size: 0.6875rem; color: #64748b; padding: 0.125rem 0.5rem; background: #f1f5f9; border-radius: 0.25rem; }
  .sq-list-host { font-size: 0.6875rem; color: #64748b; font-family: monospace; }
  .sq-list-time { font-size: 0.6875rem; color: #94a3b8; margin-left: auto; }

  /* Responsive */
  @media (max-width: 768px) {
    .stat-cards { grid-template-columns: repeat(2, 1fr); }
    .stats-row { flex-direction: column; }
    .sq-cards { grid-template-columns: repeat(3, 1fr); }
  }
</style>

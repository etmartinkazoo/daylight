<script>
  import { router } from "@inertiajs/svelte";
  import DaylightLayout from "./DaylightLayout.svelte";
  import Badge from "@/components/ui/Badge.svelte";
  import Button from "@/components/ui/Button.svelte";
  import Table from "@/components/ui/Table.svelte";
  import PeriodSelect from "./PeriodSelect.svelte";
  import EwSheet from "./EwSheet.svelte";

  let { job_classes = [], failures = [], period = "24h", totals = {}, solid_queue = null } = $props();

  let sheetOpen = $state(false);
  let sheetItem = $state(null);
  let sheetType = $state("class");

  function changePeriod(p) { router.get("/daylight/jobs", { period: p }, { preserveState: true }); }
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
</script>

<svelte:head><title>Jobs — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="ew-page">
    <div class="ew-page-header">
      <div><h1 class="ew-page-title">Jobs</h1><p class="ew-page-sub">{totals.total || 0} tracked — {totals.completed || 0} completed, {totals.failed || 0} failed</p></div>
      <PeriodSelect value={period} onchange={changePeriod} />
    </div>

    {#if solid_queue}
      <div class="sq-stats">
        <button class="sq-stat" onclick={() => openSqStat("Ready Jobs", solid_queue.ready_jobs)}>
          <span class="sq-val">{solid_queue.ready}</span>
          <span class="sq-label">Ready</span>
        </button>
        <button class="sq-stat" onclick={() => openSqStat("Scheduled Jobs", solid_queue.scheduled_jobs)}>
          <span class="sq-val">{solid_queue.scheduled}</span>
          <span class="sq-label">Scheduled</span>
        </button>
        <button class="sq-stat" onclick={() => openSqStat("Running Jobs", solid_queue.claimed_jobs)}>
          <span class="sq-val">{solid_queue.claimed}</span>
          <span class="sq-label">Running</span>
        </button>
        <button class="sq-stat" class:sq-stat-err={solid_queue.failed > 0} onclick={() => { /* failures already shown below */ }}>
          <span class="sq-val">{solid_queue.failed}</span>
          <span class="sq-label">Failed</span>
        </button>
        <button class="sq-stat" onclick={() => openSqStat("Worker Processes", solid_queue.worker_processes)}>
          <span class="sq-val">{solid_queue.processes}</span>
          <span class="sq-label">Workers</span>
        </button>
      </div>
    {/if}

    <!-- Job classes (from errorwatch tracking) -->
    {#if job_classes.length > 0}
      <div class="ew-table">
        <div class="ew-thead">
          <div class="ew-th" style="flex:2">Job Class</div>
          <div class="ew-th r" style="width:3.5rem">Total</div>
          <div class="ew-th r" style="width:4rem">Done</div>
          <div class="ew-th r" style="width:3.5rem">Failed</div>
          <div class="ew-th r" style="width:4rem">Queued</div>
          <div class="ew-th r" style="width:4.5rem">Avg</div>
          <div class="ew-th r" style="width:4.5rem">Max</div>
        </div>
        {#each job_classes as jc (jc.job_class)}
          <button class="ew-row ew-row-btn" onclick={() => openClass(jc)}>
            <div class="ew-cell" style="flex:2"><span class="job-name">{jc.job_class}</span></div>
            <div class="ew-cell num" style="width:3.5rem">{jc.total}</div>
            <div class="ew-cell num ok" style="width:4rem">{jc.completed_count}</div>
            <div class="ew-cell num" style="width:3.5rem" class:err={jc.failed_count > 0}>{jc.failed_count}</div>
            <div class="ew-cell num" style="width:4rem">{jc.queued_count}</div>
            <div class="ew-cell num" style="width:4.5rem">{fmt(jc.avg_duration)}</div>
            <div class="ew-cell num" style="width:4.5rem" class:slow={jc.max_duration > 10000}>{fmt(jc.max_duration)}</div>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Failures (merged from Solid Queue + errorwatch) -->
    {#if failures.length > 0}
      <h2 class="ew-section-title">Failures ({failures.length})</h2>
      <div class="ew-table">
        <div class="ew-thead">
          <div class="ew-th" style="flex:1.5">Job</div>
          <div class="ew-th" style="flex:1">Error</div>
          <div class="ew-th" style="width:4.5rem">Queue</div>
          <div class="ew-th r" style="width:5rem">When</div>
        </div>
        {#each failures as f (f.id)}
          <button class="ew-row ew-row-btn" onclick={() => openFailure(f)}>
            <div class="ew-cell" style="flex:1.5">
              <span class="fail-job">{f.job_class || "Unknown"}</span>
            </div>
            <div class="ew-cell" style="flex:1">
              <span class="fail-err-class">{f.error_class || "—"}</span>
            </div>
            <div class="ew-cell" style="width:4.5rem">
              <span class="fail-queue">{f.queue || "—"}</span>
            </div>
            <div class="ew-cell r" style="width:5rem">
              <span class="fail-time">{timeAgo(f.occurred_at)}</span>
            </div>
          </button>
        {/each}
      </div>
    {:else if job_classes.length === 0}
      <div class="ew-empty"><p>No job data yet.</p></div>
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
  .ew-page { display: flex; flex-direction: column; gap: 1.25rem; }
  .ew-page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .ew-page-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0; }
  .ew-page-sub { font-size: 0.8125rem; color: #6b7280; margin: 0.125rem 0 0; }
  .ew-section-title { font-size: 0.875rem; font-weight: 600; color: #374151; margin: 0; }

  /* Solid Queue stats strip */
  .sq-stats { display: flex; gap: 0; border: 1px solid #e5e7eb; overflow: hidden; }
  .sq-stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.0625rem; padding: 0.625rem 0.5rem; border: none; border-right: 1px solid #e5e7eb; background: none; font-family: inherit; cursor: pointer; transition: background 0.1s; &:last-child { border-right: none; } &:hover { background: #f3f4f6; } }
  .sq-stat-err .sq-val { color: #dc2626; }
  .sq-val { font-size: 1.125rem; font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }
  .sq-label { font-size: 0.5625rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #9ca3af; }

  .ew-table { background: #fff; border: 1px solid #e5e7eb; overflow: hidden; }
  .ew-thead { display: flex; align-items: center; padding: 0 0.75rem; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .ew-th { padding: 0.5rem 0.375rem; font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
  .r { text-align: right; }
  .ew-row { display: flex; align-items: center; padding: 0 0.75rem; border-bottom: 1px solid #f3f4f6; &:last-child { border-bottom: none; } &:hover { background: #f9fafb; } }
  .ew-row-btn { width: 100%; border: none; background: none; font-family: inherit; cursor: pointer; text-align: left; }
  .ew-cell { padding: 0.4375rem 0.375rem; font-size: 0.8125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ew-empty { text-align: center; padding: 2rem 1rem; color: #9ca3af; border: 1px solid #e5e7eb; background: #fff; }

  .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
  .ok { color: #16a34a; }
  .err { color: #dc2626; font-weight: 600; }
  .slow { color: #dc2626; font-weight: 600; }
  .job-name { font-size: 0.75rem; font-weight: 600; color: #213258; }

  .fail-job { font-size: 0.8125rem; font-weight: 600; color: #213258; }
  .fail-err-class { font-size: 0.75rem; color: #dc2626; }
  .fail-queue { font-size: 0.6875rem; color: #6b7280; }
  .fail-time { font-size: 0.6875rem; color: #9ca3af; }

  .sheet-detail { display: flex; flex-direction: column; gap: 1rem; }
  .dl { display: flex; flex-direction: column; margin: 0; }
  .dl-row { display: flex; justify-content: space-between; padding: 0.4375rem 0; border-bottom: 1px solid #f3f4f6; font-size: 0.8125rem; &:last-child { border-bottom: none; } }
  .dl-row dt { color: #6b7280; font-weight: 500; }
  .dl-row dd { color: #1e293b; font-weight: 500; margin: 0; }
  .source-badge { font-size: 0.6875rem; padding: 0.0625rem 0.375rem; background: #f3f4f6; color: #6b7280; }
  .sheet-sub { font-size: 0.6875rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; margin: 0; }
  .sheet-pre { font-size: 0.6875rem; font-family: "SF Mono", Monaco, Menlo, monospace; background: #f9fafb; padding: 0.75rem; border: 1px solid #e5e7eb; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; color: #dc2626; line-height: 1.6; }
  .sheet-count { font-size: 0.8125rem; color: #6b7280; margin: 0; }
  .sheet-empty { font-size: 0.8125rem; color: #9ca3af; margin: 0; }

  .sq-list { display: flex; flex-direction: column; border: 1px solid #e5e7eb; }
  .sq-list-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.4375rem 0.625rem; border-bottom: 1px solid #f3f4f6; font-size: 0.8125rem; flex-wrap: wrap; &:last-child { border-bottom: none; } }
  .sq-list-class { font-weight: 600; color: #213258; }
  .sq-list-queue { font-size: 0.6875rem; color: #6b7280; padding: 0.0625rem 0.375rem; background: #f3f4f6; }
  .sq-list-host { font-size: 0.6875rem; color: #6b7280; font-family: monospace; }
  .sq-list-time { font-size: 0.6875rem; color: #9ca3af; margin-left: auto; }
</style>

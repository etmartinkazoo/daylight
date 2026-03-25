<script>
  import { router } from "@inertiajs/svelte";
  import DaylightLayout from "./DaylightLayout.svelte";
  import Badge from "@/components/ui/Badge.svelte";
  import Button from "@/components/ui/Button.svelte";
  import Table from "@/components/ui/Table.svelte";
  import PeriodSelect from "./PeriodSelect.svelte";
  import EwSheet from "./EwSheet.svelte";

  let { queries = [], slowest = [], period = "24h", total_queries = 0 } = $props();

  let sheetOpen = $state(false);
  let sheetItem = $state(null);

  function changePeriod(p) { router.get("/daylight/queries", { period: p }, { preserveState: true }); }
  function fmt(ms) { if (ms == null) return "—"; return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`; }
  function timeAgo(d) { if (!d) return ""; const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (m < 1) return "now"; if (m < 60) return `${m}m`; return `${Math.floor(m / 60)}h`; }

  function openQuery(q) { sheetItem = q; sheetOpen = true; }
</script>

<svelte:head><title>Queries — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="ew-page">
    <div class="ew-page-header">
      <div><h1 class="ew-page-title">Slow Queries</h1><p class="ew-page-sub">{total_queries.toLocaleString()} slow queries (&gt;50ms) in the last {period}</p></div>
      <PeriodSelect value={period} onchange={changePeriod} />
    </div>

    <div class="ew-table">
      <div class="ew-thead">
        <div class="ew-th" style="flex:3">Query</div>
        <div class="ew-th r" style="width:3.5rem">Count</div>
        <div class="ew-th r" style="width:4.5rem">Avg</div>
        <div class="ew-th r" style="width:4.5rem">Max</div>
        <div class="ew-th" style="flex:1">Source</div>
      </div>
      {#each queries as q (q.normalized_sql)}
        <button class="ew-row ew-row-btn" onclick={() => openQuery(q)}>
          <div class="ew-cell mono" style="flex:3">{q.normalized_sql}</div>
          <div class="ew-cell num" style="width:3.5rem">{q.total}</div>
          <div class="ew-cell num" style="width:4.5rem" class:slow={q.avg_duration > 200}>{fmt(q.avg_duration)}</div>
          <div class="ew-cell num" style="width:4.5rem" class:slow={q.max_duration > 500}>{fmt(q.max_duration)}</div>
          <div class="ew-cell source" style="flex:1">{q.source_location || "—"}</div>
        </button>
      {/each}
      {#if queries.length === 0}<div class="ew-empty-row">No slow queries recorded.</div>{/if}
    </div>

    {#if slowest.length > 0}
      <h2 class="ew-section-title">Slowest Individual Queries</h2>
      <div class="ew-table">
        {#each slowest as q (q.id)}
          <button class="ew-row ew-row-btn sq-row" onclick={() => { sheetItem = q; sheetOpen = true; }}>
            <span class="sq-duration slow">{fmt(q.duration_ms)}</span>
            <span class="sq-source">{q.source_location || "—"}</span>
            <span class="sq-context">{q.controller_action}</span>
            <span class="sq-time">{timeAgo(q.occurred_at)}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</DaylightLayout>

<EwSheet bind:open={sheetOpen} title="Query Detail" aiContext={sheetItem ? `SQL Query (slow):\n${sheetItem.sql || sheetItem.normalized_sql}\n\nDuration: ${fmt(sheetItem.duration_ms || sheetItem.avg_duration)}\nMax: ${fmt(sheetItem.max_duration || sheetItem.duration_ms)}\nSource: ${sheetItem.source_location || "unknown"}\nController: ${sheetItem.controller_action || "N/A"}\nPath: ${sheetItem.request_path || "N/A"}\nOccurrences: ${sheetItem.total || 1}` : ""}>
  {#if sheetItem}
    <div class="sheet-detail">
      <dl class="dl">
        {#if sheetItem.controller_action}<div class="dl-row"><dt>Controller</dt><dd>{sheetItem.controller_action}</dd></div>{/if}
        {#if sheetItem.request_path}<div class="dl-row"><dt>Path</dt><dd class="mono">{sheetItem.request_path}</dd></div>{/if}
        {#if sheetItem.source_location}<div class="dl-row"><dt>Source</dt><dd class="mono">{sheetItem.source_location}</dd></div>{/if}
        <div class="dl-row"><dt>Duration</dt><dd class:slow={sheetItem.duration_ms > 200 || sheetItem.avg_duration > 200}>{fmt(sheetItem.duration_ms || sheetItem.avg_duration)}</dd></div>
        {#if sheetItem.max_duration}<div class="dl-row"><dt>Max</dt><dd class:slow={sheetItem.max_duration > 500}>{fmt(sheetItem.max_duration)}</dd></div>{/if}
        {#if sheetItem.total}<div class="dl-row"><dt>Occurrences</dt><dd>{sheetItem.total}</dd></div>{/if}
      </dl>

      <h4 class="sheet-sub">SQL</h4>
      <pre class="sheet-sql">{sheetItem.sql || sheetItem.normalized_sql}</pre>
    </div>
  {/if}
</EwSheet>

<style>
  .ew-page { display: flex; flex-direction: column; gap: 1.25rem; }
  .ew-page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .ew-page-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0; }
  .ew-page-sub { font-size: 0.8125rem; color: #6b7280; margin: 0.125rem 0 0; }
  .ew-section-title { font-size: 0.875rem; font-weight: 600; color: #374151; margin: 0.5rem 0 0; }

  .ew-table { background: #fff; border: 1px solid #e5e7eb; overflow: hidden; }
  .ew-thead { display: flex; align-items: center; padding: 0 0.75rem; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .ew-th { padding: 0.5rem 0.375rem; font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
  .r { text-align: right; }
  .ew-row { display: flex; align-items: center; padding: 0 0.75rem; border-bottom: 1px solid #f3f4f6; &:last-child { border-bottom: none; } &:hover { background: #f9fafb; } }
  .ew-row-btn { width: 100%; border: none; background: none; font-family: inherit; cursor: pointer; text-align: left; }
  .ew-cell { padding: 0.4375rem 0.375rem; font-size: 0.8125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ew-empty-row { padding: 1.5rem; text-align: center; color: #9ca3af; font-size: 0.8125rem; }

  .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
  .mono { font-family: "SF Mono", Monaco, Menlo, monospace; font-size: 0.6875rem; }
  .slow { color: #dc2626; font-weight: 600; }
  .source { font-size: 0.6875rem; color: #6b7280; font-family: monospace; }

  .sq-row { gap: 0.75rem; padding: 0.5rem 0.75rem; }
  .sq-duration { font-size: 0.8125rem; font-weight: 700; font-variant-numeric: tabular-nums; flex-shrink: 0; }
  .sq-source { font-size: 0.6875rem; font-family: monospace; color: #213258; }
  .sq-context { font-size: 0.6875rem; color: #6b7280; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sq-time { font-size: 0.625rem; color: #9ca3af; flex-shrink: 0; }

  .sheet-detail { display: flex; flex-direction: column; gap: 1rem; }
  .dl { display: flex; flex-direction: column; margin: 0; }
  .dl-row { display: flex; justify-content: space-between; padding: 0.4375rem 0; border-bottom: 1px solid #f3f4f6; font-size: 0.8125rem; &:last-child { border-bottom: none; } }
  .dl-row dt { color: #6b7280; font-weight: 500; }
  .dl-row dd { color: #1e293b; font-weight: 500; margin: 0; }
  .sheet-sub { font-size: 0.6875rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; margin: 0; }
  .sheet-sql { font-size: 0.6875rem; font-family: "SF Mono", Monaco, Menlo, monospace; background: #f9fafb; padding: 0.75rem; border: 1px solid #e5e7eb; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.6; }
</style>

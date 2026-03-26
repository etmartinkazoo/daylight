<script>
  import { router, usePage } from "@inertiajs/svelte";
  import DaylightLayout from "./DaylightLayout.svelte";
  import Badge from "@/components/ui/Badge.svelte";
  import Button from "@/components/ui/Button.svelte";
  import Table from "@/components/ui/Table.svelte";
  import SortableHeader from "@/components/ui/SortableHeader.svelte";
  import EwSheet from "./EwSheet.svelte";
  import DonutChart from "@/components/charts/DonutChart.svelte";
  import TimeSeriesChart from "@/components/charts/TimeSeriesChart.svelte";
  import InteractiveBarChart from "@/components/charts/InteractiveBarChart.svelte";
  import AutoRefresh from "@/components/ui/AutoRefresh.svelte";
  import ExportButton from "@/components/ui/ExportButton.svelte";

  let { errors = [], counts = {}, status = "open", query = "", error_series = [], unhandled_count = 0, deploys = [], performance = 0 } = $props();
  const pageStore = usePage();
  let base = $derived($pageStore.props?.base_path || "/daylight");

  let searchVal = $state(query || "");
  let selectedIds = $state([]);
  let sheetOpen = $state(false);
  let sheetError = $state(null);
  let refreshInterval = $state(0);
  let handledFilter = $state("all");
  let severityFilter = $state("");

  $effect(() => {
    if (refreshInterval <= 0) return;
    const id = setInterval(() => {
      router.reload({ preserveState: true, preserveScroll: true });
    }, refreshInterval);
    return () => clearInterval(id);
  });

  function navigate(s, q, extra = {}) {
    router.get(`${base}/errors`, { status: s, q: q || undefined, severity: severityFilter || undefined, ...extra }, { preserveState: true });
  }

  function resolve(id) { router.patch(`${base}/errors/${id}`, { status: "resolved", filter_status: status }); }
  function reopen(id) { router.patch(`${base}/errors/${id}`, { status: "open", filter_status: status }); }
  function ignore(id) { router.patch(`${base}/errors/${id}`, { status: "ignored", filter_status: status }); }

  function toggleSelect(id) {
    selectedIds = selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id];
  }

  function selectAll() { selectedIds = errors.map(e => e.id); }

  function batchAction(action) {
    router.post(`${base}/errors/batch`, { ids: selectedIds, action_type: action, filter_status: status }, {
      onSuccess: () => { selectedIds = []; }
    });
  }

  function handleSearch(e) { e.preventDefault(); navigate(status, searchVal); }

  function openSheet(error) {
    sheetError = error;
    sheetOpen = true;
  }

  function buildAiContext(err) {
    if (!err) return "";
    let ctx = `Error: ${err.error_class}\nMessage: ${err.message}\nOccurrences: ${err.occurrences_count}\nStatus: ${err.status}\nFirst seen: ${err.first_seen_at}\nLast seen: ${err.last_seen_at}`;
    if (err.backtrace_summary) ctx += `\n\nBacktrace:\n${err.backtrace_summary}`;
    const occ = err.recent_occurrences?.[0];
    if (occ) {
      if (occ.request_url) ctx += `\n\nLast request: ${occ.request_method} ${occ.request_url}`;
      if (occ.context?.route) ctx += `\nRoute: ${occ.context.route}`;
      if (occ.context?.controller_action) ctx += `\nController: ${occ.context.controller_action}`;
      if (occ.context?.tenant) ctx += `\nTenant: ${occ.context.tenant}`;
      if (occ.context?.user_name) ctx += `\nUser: ${occ.context.user_name}`;
    }
    return ctx;
  }

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`;
  }

  function formatTime(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  let allSelected = $derived(errors.length > 0 && selectedIds.length === errors.length);

  const tabs = [
    { key: "open", label: "Open" },
    { key: "resolved", label: "Resolved" },
    { key: "ignored", label: "Ignored" },
    { key: "all", label: "All" },
  ];

  let last24hCount = $derived(
    counts.last_24h ?? errors.filter(e => {
      if (!e.last_seen_at) return false;
      return Date.now() - new Date(e.last_seen_at).getTime() < 86400000;
    }).length
  );

  let donutSegments = $derived([
    { value: counts.open || 0, color: "#ef4444", label: "Open" },
    { value: counts.resolved || 0, color: "#22c55e", label: "Resolved" },
    { value: counts.ignored || 0, color: "#94a3b8", label: "Ignored" },
  ]);

  let totalErrors = $derived((counts.open || 0) + (counts.resolved || 0) + (counts.ignored || 0));
</script>

<svelte:head><title>Daylight</title></svelte:head>

<DaylightLayout>
  <div class="ew-page">
    <!-- Header actions -->
    <div class="ew-header-actions">
      <AutoRefresh bind:interval={refreshInterval} />
      <ExportButton baseUrl={`${base}/errors/export`} />
    </div>

    <!-- Stat cards + donut -->
    <div class="stats-row">
      <div class="stats-cards">
        <div class="stat-card" class:stat-card-danger={counts.open > 0}>
          <span class="stat-card-label">Open</span>
          <span class="stat-card-value" class:stat-value-danger={counts.open > 0}>{counts.open || 0}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Last 24h</span>
          <span class="stat-card-value">{last24hCount}</span>
        </div>
        <div class="stat-card" class:stat-card-danger={unhandled_count > 0}>
          <span class="stat-card-label">Unhandled</span>
          <span class="stat-card-value" class:stat-value-danger={unhandled_count > 0}>{unhandled_count}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Resolved</span>
          <span class="stat-card-value stat-value-success">{counts.resolved || 0}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Ignored</span>
          <span class="stat-card-value stat-value-muted">{counts.ignored || 0}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Performance</span>
          <span class="stat-card-value" style="color: #f59e0b">{counts.performance || 0}</span>
        </div>
      </div>
      {#if totalErrors > 0}
        <div class="stats-donut">
          <DonutChart
            segments={donutSegments}
            size={100}
            strokeWidth={12}
            centerValue={String(totalErrors)}
            centerLabel="total"
          />
        </div>
      {/if}
    </div>

    <!-- Error Volume Chart -->
    {#if error_series.length > 0}
      <InteractiveBarChart
        data={error_series.map(d => ({ ...d, errors: d.v }))}
        series={[{ key: "errors", label: "Errors", color: "#ef4444" }]}
        title="Error Volume"
        description="Error occurrences over time"
        height={250}
      />
    {/if}

    <!-- Tabs -->
    <div class="ew-tabs-row">
      <div class="ew-tabs">
        {#each tabs as tab (tab.key)}
          <button class="ew-tab" class:active={status === tab.key} onclick={() => navigate(tab.key, searchVal)}>
            {tab.label}
            {#if tab.key !== "all" && counts[tab.key]}<span class="ew-tab-count">{counts[tab.key]}</span>{/if}
          </button>
        {/each}
      </div>
      <div class="ew-pills">
        <button class="ew-pill" class:active={handledFilter === "all"} onclick={() => { handledFilter = "all"; navigate(status, searchVal); }}>All</button>
        <button class="ew-pill" class:active={handledFilter === "unhandled"} onclick={() => { handledFilter = "unhandled"; navigate(status, searchVal, { handled: false }); }}>
          Unhandled
          {#if unhandled_count > 0}<span class="ew-pill-count">{unhandled_count}</span>{/if}
        </button>
      </div>
      <div class="ew-pills">
        <button class="ew-pill" class:active={!severityFilter} onclick={() => { severityFilter = ""; navigate(status, searchVal); }}>All Types</button>
        <button class="ew-pill" class:active={severityFilter === "performance"} onclick={() => { severityFilter = "performance"; navigate(status, searchVal); }}>
          Performance {#if counts.performance}<span class="ew-pill-count">{counts.performance}</span>{/if}
        </button>
      </div>
    </div>

    <!-- Search -->
    <form class="ew-search" onsubmit={handleSearch}>
      <div class="search-wrapper">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input type="text" class="ew-search-input" placeholder="Search errors..." bind:value={searchVal} />
      </div>
    </form>

    <!-- Bulk actions -->
    {#if selectedIds.length > 0}
      <div class="ew-bulk">
        <div class="bulk-indicator"></div>
        <span class="ew-bulk-count">{selectedIds.length} selected</span>
        <div class="bulk-actions">
          {#if status !== "resolved"}<Button variant="outline" onclick={() => batchAction("resolve")}>Resolve</Button>{/if}
          {#if status !== "ignored"}<Button variant="outline" onclick={() => batchAction("ignore")}>Ignore</Button>{/if}
          {#if status !== "open"}<Button variant="outline" onclick={() => batchAction("reopen")}>Reopen</Button>{/if}
          <Button variant="danger" onclick={() => batchAction("delete")}>Delete</Button>
          <Button variant="outline" onclick={() => { selectedIds = []; }}>Cancel</Button>
        </div>
      </div>
    {/if}

    <!-- Table or empty state -->
    {#if errors.length === 0}
      <div class="ew-empty">
        <svg class="empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
        <p class="ew-empty-title">No errors found</p>
        <p class="ew-empty-desc">
          {#if query}No errors matching "{query}"{:else}Nothing to show for this filter{/if}
        </p>
      </div>
    {:else}
      <div class="data-table">
        <div class="ew-thead">
          <div class="ew-th ew-col-check"><input type="checkbox" checked={allSelected} onchange={() => allSelected ? selectedIds = [] : selectAll()} /></div>
          <div class="ew-th" style="flex:2"><SortableHeader column="error_class" label="Error" /></div>
          <div class="ew-th" style="width:4rem;text-align:center"><SortableHeader column="occurrences_count" label="Count" /></div>
          <div class="ew-th" style="width:5.5rem">Status</div>
          <div class="ew-th" style="width:7rem"><SortableHeader column="last_seen_at" label="Last Seen" /></div>
          <div class="ew-th" style="width:5rem"></div>
        </div>
        {#each errors as error (error.id)}
          <div class="ew-row" class:ew-row-selected={selectedIds.includes(error.id)}>
            <div class="ew-cell ew-col-check" onclick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={selectedIds.includes(error.id)} onchange={() => toggleSelect(error.id)} />
            </div>
            <button class="ew-cell ew-cell-btn" style="flex:2" onclick={() => openSheet(error)}>
              <span class="ew-error-class">{error.error_class}</span>
              {#if error.severity === "performance"}
                <span class="ew-perf-info">avg: {error.avg_duration_ms ?? "—"}ms, max: {error.max_duration_ms ?? "—"}ms, exceeded: {error.exceeded_count ?? 0} times</span>
              {:else}
                <span class="ew-error-msg">{error.message}</span>
              {/if}
            </button>
            <div class="ew-cell" style="width:4rem;text-align:center">
              <span class="ew-count-badge">{error.occurrences_count}</span>
              {#if error.affected_users_count > 0}
                <span class="ew-users-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {error.affected_users_count}
                </span>
              {/if}
            </div>
            <div class="ew-cell" style="width:5.5rem">
              <span class="ew-status" class:ew-status-open={error.status === "open"} class:ew-status-resolved={error.status === "resolved"} class:ew-status-ignored={error.status === "ignored"}>{error.status}</span>
            </div>
            <div class="ew-cell" style="width:7rem">
              <span class="ew-time">{timeAgo(error.last_seen_at)}</span>
            </div>
            <div class="ew-cell" style="width:5rem;text-align:right" onclick={(e) => e.stopPropagation()}>
              {#if error.status === "open"}
                <Button variant="outline" size="sm" onclick={() => resolve(error.id)}>Resolve</Button>
              {:else}
                <Button variant="outline" size="sm" onclick={() => reopen(error.id)}>Reopen</Button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</DaylightLayout>

<EwSheet bind:open={sheetOpen} title={sheetError?.error_class || "Error"} aiContext={buildAiContext(sheetError)}>
  {#if sheetError}
    <div class="sheet-detail">
      <div class="sheet-status-row">
        <span class="ew-status" class:ew-status-open={sheetError.status === "open"} class:ew-status-resolved={sheetError.status === "resolved"} class:ew-status-ignored={sheetError.status === "ignored"}>{sheetError.status}</span>
        <span class="sheet-count">{sheetError.occurrences_count} occurrence{sheetError.occurrences_count === 1 ? "" : "s"}</span>
      </div>

      <h4 class="sheet-sub">Message</h4>
      <p class="sheet-msg">{sheetError.message}</p>

      <!-- Where it happened -->
      {#if sheetError.recent_occurrences?.length > 0}
        {@const lastOcc = sheetError.recent_occurrences[0]}
        {#if lastOcc.request_url || lastOcc.context?.route || lastOcc.context?.controller_action}
          <h4 class="sheet-sub">Where</h4>
          <div class="sheet-where">
            {#if lastOcc.request_method && lastOcc.request_url}
              <div class="where-row">
                <span class="where-label">URL</span>
                <span class="where-val mono">{lastOcc.request_method} {lastOcc.request_url}</span>
              </div>
            {/if}
            {#if lastOcc.context?.route}
              <div class="where-row">
                <span class="where-label">Route</span>
                <span class="where-val">{lastOcc.context.route}</span>
              </div>
            {/if}
            {#if lastOcc.context?.controller_action}
              <div class="where-row">
                <span class="where-label">Controller</span>
                <span class="where-val">{lastOcc.context.controller_action}</span>
              </div>
            {/if}
            {#if lastOcc.context?.tenant}
              <div class="where-row">
                <span class="where-label">Tenant</span>
                <span class="where-val">{lastOcc.context.tenant}</span>
              </div>
            {/if}
            {#if lastOcc.context?.user_name}
              <div class="where-row">
                <span class="where-label">User</span>
                <span class="where-val">{lastOcc.context.user_name} (#{lastOcc.context.user_id})</span>
              </div>
            {/if}
          </div>
        {/if}
      {/if}

      <div class="sheet-meta">
        <div><span class="sheet-meta-label">First seen</span><span>{formatTime(sheetError.first_seen_at)}</span></div>
        <div><span class="sheet-meta-label">Last seen</span><span>{formatTime(sheetError.last_seen_at)}</span></div>
        <div><span class="sheet-meta-label">Severity</span><span>{sheetError.severity}</span></div>
      </div>

      {#if sheetError.backtrace_summary}
        <h4 class="sheet-sub">Backtrace</h4>
        <pre class="sheet-pre">{sheetError.backtrace_summary}</pre>
      {/if}

      <!-- Recent occurrences -->
      {#if sheetError.recent_occurrences?.length > 1}
        <h4 class="sheet-sub">Recent Occurrences</h4>
        <div class="occ-list">
          {#each sheetError.recent_occurrences as occ (occ.id)}
            <div class="occ-item">
              <span class="occ-time">{formatTime(occ.occurred_at)}</span>
              {#if occ.request_url}
                <span class="occ-url">{occ.request_method} {occ.request_url}</span>
              {/if}
              {#if occ.context?.route}
                <span class="occ-route">{occ.context.route}</span>
              {/if}
              {#if occ.context?.user_name}
                <span class="occ-user">{occ.context.user_name}</span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <div class="sheet-actions">
        {#if sheetError.status === "open"}
          <button class="ew-action-btn" onclick={() => { resolve(sheetError.id); sheetOpen = false; }}>Resolve</button>
          <button class="ew-action-btn" onclick={() => { ignore(sheetError.id); sheetOpen = false; }}>Ignore</button>
        {:else}
          <button class="ew-action-btn" onclick={() => { reopen(sheetError.id); sheetOpen = false; }}>Reopen</button>
        {/if}
        <a href={`${base}/errors/${sheetError.id}`} class="ew-action-link">View full detail &rarr;</a>
      </div>
    </div>
  {/if}
</EwSheet>

<style>
  .ew-page { display: flex; flex-direction: column; gap: 1.25rem; }

  /* Stat cards row */
  .stats-row {
    display: flex;
    align-items: stretch;
    gap: 1.25rem;
  }
  .stats-cards {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.75rem;
    flex: 1;
  }
  .stat-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .stat-card:hover {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }
  .stat-card-danger {
    border-color: #fecaca;
  }
  .stat-card-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #64748b;
  }
  .stat-card-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: #0f172a;
    letter-spacing: -0.02em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .stat-value-danger { color: #ef4444; }
  .stat-value-success { color: #22c55e; }
  .stat-value-muted { color: #64748b; }
  .stats-donut {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  /* Tabs */
  .ew-tabs {
    display: flex;
    gap: 0.25rem;
    background: #f1f5f9;
    border-radius: 0.5rem;
    padding: 0.25rem;
    width: fit-content;
  }
  .ew-tab {
    padding: 0.4375rem 0.875rem;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: inherit;
    border: none;
    background: none;
    color: #64748b;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .ew-tab:hover { color: #0f172a; background: rgba(255, 255, 255, 0.5); }
  .ew-tab.active {
    color: #0f172a;
    background: #fff;
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  }
  .ew-tab-count {
    font-size: 0.6875rem;
    font-weight: 700;
    margin-left: 0.25rem;
    opacity: 0.6;
  }

  /* Search */
  .ew-search { display: flex; }
  .search-wrapper {
    position: relative;
    flex: 1;
  }
  .search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    pointer-events: none;
  }
  .ew-search-input {
    width: 100%;
    padding: 0.5625rem 0.75rem 0.5625rem 2.25rem;
    font-size: 0.8125rem;
    font-family: inherit;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    background: #fff;
    color: #0f172a;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }
  .ew-search-input:focus {
    border-color: #94a3b8;
    box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.15);
  }
  .ew-search-input::placeholder { color: #94a3b8; }

  /* Bulk actions */
  .ew-bulk {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 1rem;
    background: #0f172a;
    color: #fff;
    border-radius: 0.75rem;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
  }
  .bulk-indicator {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: #38bdf8;
    flex-shrink: 0;
    animation: pulse-dot 2s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .ew-bulk-count {
    font-size: 0.8125rem;
    font-weight: 600;
    margin-right: 0.25rem;
  }
  .bulk-actions {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-left: auto;
  }

  /* Data table */
  .data-table {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
  }
  .ew-thead {
    display: flex;
    align-items: center;
    padding: 0 0.75rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }
  .ew-th {
    padding: 0.625rem 0.375rem;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
  }
  .ew-row {
    display: flex;
    align-items: center;
    padding: 0 0.75rem;
    border-bottom: 1px solid #f1f5f9;
    transition: background-color 0.1s;
  }
  .ew-row:last-child { border-bottom: none; }
  .ew-row:hover { background: #f8fafc; }
  .ew-row.ew-row-selected { background: #eff6ff; }
  .ew-cell {
    padding: 0.625rem 0.375rem;
    font-size: 0.8125rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ew-cell-btn {
    border: none;
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }
  .ew-col-check { width: 2rem; flex-shrink: 0; }
  .ew-col-check input { accent-color: #0f172a; cursor: pointer; }
  .ew-error-class { font-size: 0.8125rem; font-weight: 600; color: #0f172a; }
  .ew-error-msg { font-size: 0.6875rem; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
  .ew-count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    height: 1.375rem;
    padding: 0 0.375rem;
    font-size: 0.6875rem;
    font-weight: 700;
    background: #f1f5f9;
    color: #334155;
    border-radius: 999px;
    font-variant-numeric: tabular-nums;
  }
  .ew-status {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: capitalize;
    letter-spacing: 0.01em;
    padding: 0.1875rem 0.5rem;
    border-radius: 999px;
  }
  .ew-status.ew-status-open { background: #fef2f2; color: #dc2626; }
  .ew-status.ew-status-resolved { background: #f0fdf4; color: #16a34a; }
  .ew-status.ew-status-ignored { background: #f1f5f9; color: #94a3b8; }
  .ew-time { font-size: 0.75rem; color: #64748b; }
  .ew-users-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    font-size: 0.5625rem;
    font-weight: 600;
    color: #64748b;
    margin-left: 0.25rem;
  }
  .ew-perf-info {
    font-size: 0.6875rem;
    color: #f59e0b;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  /* Empty state */
  .ew-empty {
    text-align: center;
    padding: 4rem 1rem;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
  .empty-icon { opacity: 0.6; }
  .ew-empty-title {
    font-size: 1rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
  }
  .ew-empty-desc {
    font-size: 0.8125rem;
    color: #64748b;
    margin: 0;
  }

  /* Sheet */
  .sheet-detail { display: flex; flex-direction: column; gap: 1rem; }
  .sheet-status-row { display: flex; align-items: center; gap: 0.75rem; }
  .sheet-count { font-size: 0.8125rem; color: #64748b; }
  .sheet-sub { font-size: 0.6875rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; margin: 0; }
  .sheet-msg { font-size: 0.875rem; color: #1e293b; margin: 0; word-break: break-word; line-height: 1.5; }
  .sheet-meta { display: flex; flex-direction: column; gap: 0.375rem; }
  .sheet-meta div { display: flex; justify-content: space-between; font-size: 0.8125rem; }
  .sheet-meta-label { color: #64748b; }
  .sheet-pre { font-size: 0.6875rem; font-family: "SF Mono", Monaco, Menlo, monospace; background: #f8fafc; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.7; }
  .sheet-actions { display: flex; align-items: center; gap: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0; }
  .ew-action-btn {
    padding: 0.4375rem 0.875rem;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: inherit;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    background: #fff;
    color: #334155;
    cursor: pointer;
    transition: background-color 0.1s;
  }
  .ew-action-btn:hover { background: #f8fafc; }
  .ew-action-link { font-size: 0.8125rem; font-weight: 500; color: #0f172a; text-decoration: none; margin-left: auto; }
  .ew-action-link:hover { text-decoration: underline; }

  /* Where section */
  .sheet-where { display: flex; flex-direction: column; gap: 0; border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; }
  .where-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.625rem; border-bottom: 1px solid #f1f5f9; }
  .where-row:last-child { border-bottom: none; }
  .where-label { font-size: 0.6875rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; width: 5rem; flex-shrink: 0; }
  .where-val { font-size: 0.8125rem; color: #1e293b; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mono { font-family: "SF Mono", Monaco, Menlo, monospace; font-size: 0.75rem; }

  /* Occurrence list */
  .occ-list { display: flex; flex-direction: column; border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; }
  .occ-item { display: flex; align-items: center; gap: 0.625rem; padding: 0.375rem 0.625rem; border-bottom: 1px solid #f1f5f9; font-size: 0.75rem; }
  .occ-item:last-child { border-bottom: none; }
  .occ-time { color: #64748b; font-weight: 500; flex-shrink: 0; }
  .occ-url { color: #334155; font-family: monospace; font-size: 0.6875rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .occ-route { color: #0f172a; font-weight: 500; }
  .occ-user { color: #94a3b8; margin-left: auto; flex-shrink: 0; }

  /* Header actions */
  .ew-header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  /* Tabs row with pills */
  .ew-tabs-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  /* Handled/Unhandled pills */
  .ew-pills {
    display: flex;
    gap: 0.25rem;
    background: #f1f5f9;
    border-radius: 0.5rem;
    padding: 0.25rem;
  }
  .ew-pill {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    font-family: inherit;
    border: none;
    background: none;
    color: #64748b;
    cursor: pointer;
    border-radius: 0.375rem;
    transition: all 0.15s;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }
  .ew-pill:hover { color: #0f172a; background: rgba(255, 255, 255, 0.5); }
  .ew-pill.active {
    color: #0f172a;
    background: #fff;
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  }
  .ew-pill-count {
    font-size: 0.625rem;
    font-weight: 700;
    background: #fef2f2;
    color: #ef4444;
    padding: 0.0625rem 0.375rem;
    border-radius: 9999px;
  }

  /* Chart section */
  .chart-section {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.25rem;
  }
</style>

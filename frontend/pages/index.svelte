<script>
  import { router } from "@inertiajs/svelte";
  import DaylightLayout from "./DaylightLayout.svelte";
  import Badge from "@/components/ui/Badge.svelte";
  import Button from "@/components/ui/Button.svelte";
  import Table from "@/components/ui/Table.svelte";
  import SortableHeader from "@/components/ui/SortableHeader.svelte";
  import EwSheet from "./EwSheet.svelte";

  let { errors = [], counts = {}, status = "open", query = "" } = $props();

  let searchVal = $state(query || "");
  let selectedIds = $state([]);
  let sheetOpen = $state(false);
  let sheetError = $state(null);

  function navigate(s, q) {
    router.get("/daylight/errors", { status: s, q: q || undefined }, { preserveState: true });
  }

  function resolve(id) { router.patch(`/daylight/errors/${id}`, { status: "resolved", filter_status: status }); }
  function reopen(id) { router.patch(`/daylight/errors/${id}`, { status: "open", filter_status: status }); }
  function ignore(id) { router.patch(`/daylight/errors/${id}`, { status: "ignored", filter_status: status }); }

  function toggleSelect(id) {
    selectedIds = selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id];
  }

  function selectAll() { selectedIds = errors.map(e => e.id); }

  function batchAction(action) {
    router.post("/daylight/errors/batch", { ids: selectedIds, action_type: action, filter_status: status }, {
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
</script>

<svelte:head><title>Daylight</title></svelte:head>

<DaylightLayout>
  <div class="ew-page">
    <div class="ew-tabs">
      {#each tabs as tab (tab.key)}
        <button class="ew-tab" class:active={status === tab.key} onclick={() => navigate(tab.key, searchVal)}>
          {tab.label}
          {#if tab.key !== "all" && counts[tab.key]}<span class="ew-tab-count">{counts[tab.key]}</span>{/if}
        </button>
      {/each}
    </div>

    <form class="ew-search" onsubmit={handleSearch}>
      <input type="text" class="ew-search-input" placeholder="Search errors..." bind:value={searchVal} />
    </form>

    {#if selectedIds.length > 0}
      <div class="ew-bulk">
        <span class="ew-bulk-count">{selectedIds.length} selected</span>
        {#if status !== "resolved"}<Button variant="outline" onclick={() => batchAction("resolve")}>Resolve</Button>{/if}
        {#if status !== "ignored"}<Button variant="outline" onclick={() => batchAction("ignore")}>Ignore</Button>{/if}
        {#if status !== "open"}<Button variant="outline" onclick={() => batchAction("reopen")}>Reopen</Button>{/if}
        <Button variant="danger" onclick={() => batchAction("delete")}>Delete</Button>
        <Button variant="outline" onclick={() => { selectedIds = []; }}>Cancel</Button>
      </div>
    {/if}

    {#if errors.length === 0}
      <div class="ew-empty"><p class="ew-empty-title">No errors</p></div>
    {:else}
      <div class="ew-table">
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
              <span class="ew-error-msg">{error.message}</span>
            </button>
            <div class="ew-cell" style="width:4rem;text-align:center"><span class="ew-count-badge">{error.occurrences_count}</span></div>
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
        <a href={`/daylight/errors/${sheetError.id}`} class="ew-action-link">View full detail &rarr;</a>
      </div>
    </div>
  {/if}
</EwSheet>

<style>
  .ew-page { display: flex; flex-direction: column; gap: 1rem; }

  .ew-tabs { display: flex; gap: 0; border-bottom: 1px solid #e5e7eb; }
  .ew-tab {
    padding: 0.5rem 0.875rem; font-size: 0.8125rem; font-weight: 500; font-family: inherit;
    border: none; background: none; color: #6b7280; cursor: pointer;
    border-bottom: 2px solid transparent; margin-bottom: -1px;
    &:hover { color: #1e293b; } &.active { color: #213258; border-bottom-color: #213258; font-weight: 600; }
  }
  .ew-tab-count { font-size: 0.6875rem; font-weight: 700; margin-left: 0.25rem; opacity: 0.7; }

  .ew-search { display: flex; }
  .ew-search-input { flex: 1; padding: 0.5rem 0.75rem; font-size: 0.8125rem; font-family: inherit; border: 1px solid #e5e7eb; border-radius: 0; background: #fff; color: #1e293b; outline: none; &:focus { border-color: #213258; box-shadow: 0 0 0 2px rgba(33,50,88,0.1); } &::placeholder { color: #9ca3af; } }

  .ew-bulk { display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem 0.75rem; background: #213258; color: #fff; }
  .ew-bulk-count { font-size: 0.8125rem; font-weight: 600; margin-right: 0.5rem; }
  .ew-btn { padding: 0.3125rem 0.625rem; font-size: 0.75rem; font-weight: 500; font-family: inherit; border: 1px solid rgba(255,255,255,0.3); border-radius: 0; background: transparent; color: #fff; cursor: pointer; &:hover { background: rgba(255,255,255,0.1); } }
  .ew-btn-danger { border-color: #fca5a5; color: #fca5a5; &:hover { background: rgba(239,68,68,0.15); } }

  .ew-table { background: #fff; border: 1px solid #e5e7eb; overflow: hidden; }
  .ew-thead { display: flex; align-items: center; padding: 0 0.75rem; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .ew-th { padding: 0.5rem 0.375rem; font-size: 0.5625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
  .ew-row { display: flex; align-items: center; padding: 0 0.75rem; border-bottom: 1px solid #f3f4f6; &:last-child { border-bottom: none; } &:hover { background: #f9fafb; } &.ew-row-selected { background: rgba(33,50,88,0.04); } }
  .ew-cell { padding: 0.5rem 0.375rem; font-size: 0.8125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ew-cell-btn { border: none; background: none; font-family: inherit; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 0.0625rem; min-width: 0; }
  .ew-col-check { width: 2rem; flex-shrink: 0; }
  .ew-col-check input { accent-color: #213258; cursor: pointer; }
  .ew-empty { text-align: center; padding: 3rem 1rem; background: #fff; border: 1px solid #e5e7eb; }
  .ew-empty-title { font-size: 1rem; font-weight: 500; color: #6b7280; }

  .ew-error-class { font-size: 0.8125rem; font-weight: 600; color: #213258; }
  .ew-error-msg { font-size: 0.6875rem; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
  .ew-count-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 1.5rem; height: 1.25rem; padding: 0 0.375rem; font-size: 0.6875rem; font-weight: 700; background: #f3f4f6; color: #374151; }
  .ew-status { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 0.125rem 0.375rem; &.ew-status-open { background: #fef2f2; color: #dc2626; } &.ew-status-resolved { background: #f0fdf4; color: #16a34a; } &.ew-status-ignored { background: #f3f4f6; color: #9ca3af; } }
  .ew-time { font-size: 0.75rem; color: #6b7280; }
  .ew-btn-sm { padding: 0.1875rem 0.5rem; font-size: 0.6875rem; font-weight: 500; font-family: inherit; border: 1px solid #e5e7eb; border-radius: 0; background: #fff; color: #6b7280; cursor: pointer; &:hover { background: #f3f4f6; } }

  /* Sheet */
  .sheet-detail { display: flex; flex-direction: column; gap: 1rem; }
  .sheet-status-row { display: flex; align-items: center; gap: 0.75rem; }
  .sheet-count { font-size: 0.8125rem; color: #6b7280; }
  .sheet-sub { font-size: 0.6875rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; margin: 0; }
  .sheet-msg { font-size: 0.875rem; color: #1e293b; margin: 0; word-break: break-word; line-height: 1.5; }
  .sheet-meta { display: flex; flex-direction: column; gap: 0.375rem; }
  .sheet-meta div { display: flex; justify-content: space-between; font-size: 0.8125rem; }
  .sheet-meta-label { color: #6b7280; }
  .sheet-pre { font-size: 0.6875rem; font-family: "SF Mono", Monaco, Menlo, monospace; background: #f9fafb; padding: 0.75rem; border: 1px solid #e5e7eb; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.7; }
  .sheet-actions { display: flex; align-items: center; gap: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e5e7eb; }
  .ew-action-btn { padding: 0.375rem 0.75rem; font-size: 0.8125rem; font-weight: 500; font-family: inherit; border: 1px solid #e5e7eb; border-radius: 0; background: #fff; color: #374151; cursor: pointer; &:hover { background: #f3f4f6; } }
  .ew-action-link { font-size: 0.8125rem; font-weight: 500; color: #213258; text-decoration: none; margin-left: auto; &:hover { text-decoration: underline; } }

  /* Where section */
  .sheet-where { display: flex; flex-direction: column; gap: 0; border: 1px solid #e5e7eb; }
  .where-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.625rem; border-bottom: 1px solid #f3f4f6; &:last-child { border-bottom: none; } }
  .where-label { font-size: 0.6875rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; width: 5rem; flex-shrink: 0; }
  .where-val { font-size: 0.8125rem; color: #1e293b; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mono { font-family: "SF Mono", Monaco, Menlo, monospace; font-size: 0.75rem; }

  /* Occurrence list */
  .occ-list { display: flex; flex-direction: column; border: 1px solid #e5e7eb; }
  .occ-item { display: flex; align-items: center; gap: 0.625rem; padding: 0.375rem 0.625rem; border-bottom: 1px solid #f3f4f6; font-size: 0.75rem; &:last-child { border-bottom: none; } }
  .occ-time { color: #6b7280; font-weight: 500; flex-shrink: 0; }
  .occ-url { color: #374151; font-family: monospace; font-size: 0.6875rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .occ-route { color: #213258; font-weight: 500; }
  .occ-user { color: #9ca3af; margin-left: auto; flex-shrink: 0; }
</style>

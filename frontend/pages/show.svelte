<script>
  import { router, usePage } from "@inertiajs/svelte";
  import DaylightLayout from "./DaylightLayout.svelte";
  import Badge from "@/components/ui/Badge.svelte";
  import Button from "@/components/ui/Button.svelte";
  import Table from "@/components/ui/Table.svelte";

  let { error = {}, occurrences = [] } = $props();
  const pageStore = usePage();
  let base = $derived($pageStore.props?.base_path || "/daylight");

  function updateStatus(status) {
    router.patch(`${base}/errors/${error.id}`, { status, filter_status: "open" });
  }

  function deleteError() {
    if (confirm("Delete this error and all occurrences?")) {
      router.delete(`${base}/errors/${error.id}`);
    }
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
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  function formatTime(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }
</script>

<svelte:head>
  <title>{error.error_class} — Daylight</title>
</svelte:head>

<DaylightLayout>
  <div class="page">
    <a href={`${base}/errors`} class="back-link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 12L6 8l4-4" />
      </svg>
      Back to errors
    </a>

    <!-- Error header card -->
    <div class="error-card">
      <div class="error-card-top">
        <div class="error-title-row">
          <h1 class="error-class">{error.error_class}</h1>
          <span class="status-badge" class:status-open={error.status === "open"} class:status-resolved={error.status === "resolved"} class:status-ignored={error.status === "ignored"}>
            {error.status}
          </span>
        </div>
        <p class="error-message">{error.message}</p>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-label">Occurrences</span>
          <span class="meta-value">{error.occurrences_count}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">First seen</span>
          <span class="meta-value">{formatTime(error.first_seen_at)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Last seen</span>
          <span class="meta-value">{formatTime(error.last_seen_at)}</span>
        </div>
      </div>

      <div class="action-bar">
        {#if error.status === "open"}
          <button class="action-btn" onclick={() => updateStatus("resolved")}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13.25 4.75L6 12 2.75 8.75" />
            </svg>
            Resolve
          </button>
          <button class="action-btn" onclick={() => updateStatus("ignored")}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.5 2.5L13.5 13.5M6.588 6.609a2.002 2.002 0 002.803 2.803M2.83 8.36A6.2 6.2 0 012 8c1.163-2.61 3.416-4.5 6-4.5.636 0 1.253.094 1.84.27M9.878 5.122A6.2 6.2 0 0114 8c-1.163 2.61-3.416 4.5-6 4.5a5.66 5.66 0 01-1.84-.27" />
            </svg>
            Ignore
          </button>
        {:else}
          <button class="action-btn" onclick={() => updateStatus("open")}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
              <path d="M5.75 8h4.5" />
            </svg>
            Reopen
          </button>
        {/if}
        <button class="action-btn action-btn-danger" onclick={deleteError}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2.5 4.5h11M5.5 4.5V3a1 1 0 011-1h3a1 1 0 011 1v1.5M12.5 4.5l-.5 9a1 1 0 01-1 1h-6a1 1 0 01-1-1l-.5-9" />
          </svg>
          Delete
        </button>
      </div>
    </div>

    <!-- Backtrace -->
    {#if error.backtrace_summary}
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Backtrace</h2>
        </div>
        <div class="section-body-flush">
          <pre class="backtrace">{error.backtrace_summary}</pre>
        </div>
      </div>
    {/if}

    <!-- Occurrences -->
    <div class="section-card">
      <div class="section-header">
        <h2 class="section-title">Recent Occurrences</h2>
        <span class="occurrence-count">{occurrences.length}</span>
      </div>
      <div class="occurrences-body">
        {#each occurrences as occ (occ.id)}
          <div class="occ-item">
            <div class="occ-header">
              <span class="occ-time">{formatTime(occ.occurred_at)}</span>
              {#if occ.request_url}
                <span class="occ-url">
                  <span class="occ-method">{occ.request_method}</span>
                  {occ.request_url}
                </span>
              {/if}
            </div>

            {#if occ.context && Object.keys(occ.context).length > 0}
              <pre class="occ-context">{JSON.stringify(occ.context, null, 2)}</pre>
            {/if}

            {#if occ.backtrace}
              <details class="occ-details">
                <summary class="occ-summary">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                  Backtrace
                </summary>
                <pre class="occ-bt">{occ.backtrace}</pre>
              </details>
            {/if}
          </div>
        {/each}

        {#if occurrences.length === 0}
          <div class="occ-empty">No occurrences recorded yet.</div>
        {/if}
      </div>
    </div>
  </div>
</DaylightLayout>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Back link */
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #64748b;
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .back-link:hover {
    color: #0f172a;
  }

  /* Error header card */
  .error-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .error-card-top {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .error-title-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .error-class {
    font-size: 1.125rem;
    font-weight: 700;
    color: #dc2626;
    margin: 0;
    word-break: break-word;
    flex: 1;
    min-width: 0;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.1875rem 0.625rem;
    border-radius: 9999px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .status-open {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .status-resolved {
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  }

  .status-ignored {
    background: #f8fafc;
    color: #94a3b8;
    border: 1px solid #e2e8f0;
  }

  .error-message {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0;
    word-break: break-word;
    line-height: 1.5;
  }

  /* Meta grid */
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border-top: 1px solid #f1f5f9;
    border-bottom: 1px solid #f1f5f9;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding: 1rem 1.5rem;
  }

  .meta-item:not(:last-child) {
    border-right: 1px solid #f1f5f9;
  }

  .meta-label {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
  }

  .meta-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: #0f172a;
  }

  @media (max-width: 540px) {
    .meta-grid {
      grid-template-columns: 1fr;
    }
    .meta-item:not(:last-child) {
      border-right: none;
      border-bottom: 1px solid #f1f5f9;
    }
  }

  /* Action bar */
  .action-bar {
    display: flex;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    flex-wrap: wrap;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.4375rem 0.875rem;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: inherit;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    background: #fff;
    color: #0f172a;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-btn:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  .action-btn-danger {
    color: #dc2626;
    border-color: #fecaca;
  }

  .action-btn-danger:hover {
    background: #fef2f2;
    border-color: #fca5a5;
  }

  /* Section cards */
  .section-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
  }

  .section-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
  }

  .occurrence-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.375rem;
    height: 1.375rem;
    padding: 0 0.4375rem;
    font-size: 0.6875rem;
    font-weight: 700;
    color: #64748b;
    background: #f1f5f9;
    border-radius: 9999px;
  }

  .section-body-flush {
    padding: 0;
  }

  /* Backtrace */
  .backtrace {
    background: #0f172a;
    color: #e2e8f0;
    padding: 1.25rem 1.5rem;
    font-family: "SF Mono", Monaco, Menlo, "Courier New", monospace;
    font-size: 0.75rem;
    line-height: 1.8;
    overflow-x: auto;
    white-space: pre;
    margin: 0;
  }

  /* Occurrences */
  .occurrences-body {
    display: flex;
    flex-direction: column;
  }

  .occ-item {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 1rem 1.5rem;
  }

  .occ-item:not(:last-child) {
    border-bottom: 1px solid #f1f5f9;
  }

  .occ-header {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    flex-wrap: wrap;
  }

  .occ-time {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #0f172a;
  }

  .occ-url {
    font-size: 0.75rem;
    color: #64748b;
    font-family: "SF Mono", Monaco, Menlo, "Courier New", monospace;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }

  .occ-method {
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #fff;
    background: #64748b;
    padding: 0.0625rem 0.375rem;
    border-radius: 0.25rem;
  }

  .occ-context {
    font-size: 0.75rem;
    color: #64748b;
    font-family: "SF Mono", Monaco, Menlo, "Courier New", monospace;
    background: #f8fafc;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid #f1f5f9;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    line-height: 1.6;
  }

  .occ-details {
    margin: 0;
  }

  .occ-summary {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #94a3b8;
    cursor: pointer;
    user-select: none;
    transition: color 0.15s ease;
    list-style: none;
  }

  .occ-summary::-webkit-details-marker {
    display: none;
  }

  .occ-summary:hover {
    color: #64748b;
  }

  .occ-details[open] .occ-summary svg {
    transform: rotate(90deg);
  }

  .occ-bt {
    font-size: 0.6875rem;
    color: #cbd5e1;
    font-family: "SF Mono", Monaco, Menlo, "Courier New", monospace;
    white-space: pre;
    overflow-x: auto;
    max-height: 200px;
    overflow-y: auto;
    margin: 0.5rem 0 0;
    padding: 0.75rem 1rem;
    background: #0f172a;
    border-radius: 0.5rem;
    line-height: 1.7;
  }

  .occ-empty {
    padding: 2rem 1.5rem;
    text-align: center;
    font-size: 0.875rem;
    color: #94a3b8;
  }
</style>

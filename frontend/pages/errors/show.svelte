<script>
  import { router } from "@inertiajs/svelte";
  import DaylightLayout from "../DaylightLayout.svelte";
  import Badge from "@/components/ui/Badge.svelte";
  import Button from "@/components/ui/Button.svelte";
  import Table from "@/components/ui/Table.svelte";
  import { timeAgo, formatTime } from "@/lib/formatters.js";

  let { error = {}, occurrences = [], base_path: base = "/daylight" } = $props();

  function updateStatus(status) {
    router.patch(`${base}/errors/${error.id}`, { status, filter_status: "open" });
  }

  function deleteError() {
    if (confirm("Delete this error and all occurrences?")) {
      router.delete(`${base}/errors/${error.id}`);
    }
  }
</script>

<svelte:head>
  <title>{error.error_class} — Daylight</title>
</svelte:head>

<DaylightLayout>
  <div class="dl-page">
    <a href={`${base}/errors`} class="dl-back-btn">
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
      <div class="dl-card">
        <div class="dl-card-header">
          <h2 class="dl-card-title">Backtrace</h2>
        </div>
        <div class="dl-card-body" style="padding: 0;">
          <pre class="backtrace">{error.backtrace_summary}</pre>
        </div>
      </div>
    {/if}

    <!-- Occurrences -->
    <div class="dl-card">
      <div class="dl-card-header">
        <h2 class="dl-card-title">Recent Occurrences</h2>
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
  .error-card { background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 0.75rem; overflow: hidden; display: flex; flex-direction: column; }
  .error-card-top { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .error-title-row { display: flex; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap; }
  .error-class { font-size: 1.125rem; font-weight: 700; color: var(--color-danger-hover); margin: 0; word-break: break-word; flex: 1; min-width: 0; }
  .error-message { font-size: 0.875rem; color: var(--color-muted); margin: 0; word-break: break-word; line-height: 1.5; }

  .status-badge { display: inline-flex; align-items: center; font-size: 0.6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.1875rem 0.625rem; border-radius: 9999px; white-space: nowrap; flex-shrink: 0; }
  .status-open { background: var(--color-danger-subtle); color: var(--color-danger-hover); border: 1px solid var(--color-danger-border); }
  .status-resolved { background: var(--color-success-subtle); color: var(--color-success-dark); border: 1px solid var(--color-success-border); }
  .status-ignored { background: var(--color-surface); color: var(--color-muted-light); border: 1px solid var(--color-border); }

  .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--color-accent); border-bottom: 1px solid var(--color-accent); }
  .meta-item { display: flex; flex-direction: column; gap: 0.125rem; padding: 1rem 1.5rem; }
  .meta-item:not(:last-child) { border-right: 1px solid var(--color-accent); }
  .meta-label { font-size: 0.6875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted-light); }
  .meta-value { font-size: 0.875rem; font-weight: 600; color: var(--color-fg); }

  @media (max-width: 540px) {
    .meta-grid { grid-template-columns: 1fr; }
    .meta-item:not(:last-child) { border-right: none; border-bottom: 1px solid var(--color-accent); }
  }

  .action-bar { display: flex; gap: 0.5rem; padding: 1rem 1.5rem; flex-wrap: wrap; }
  .action-btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.4375rem 0.875rem; font-size: 0.8125rem; font-weight: 500; font-family: inherit; border: 1px solid var(--color-border); border-radius: 0.5rem; background: var(--color-bg); color: var(--color-fg); cursor: pointer; transition: all 0.15s ease; }
  .action-btn:hover { background: var(--color-surface); border-color: var(--color-muted-lightest); }
  .action-btn-danger { color: var(--color-danger-hover); border-color: var(--color-danger-border); }
  .action-btn-danger:hover { background: var(--color-danger-subtle); border-color: #fca5a5; }

  .backtrace { background: var(--color-fg); color: var(--color-border); padding: 1.25rem 1.5rem; font-family: "SF Mono", Monaco, Menlo, "Courier New", monospace; font-size: 0.75rem; line-height: 1.8; overflow-x: auto; white-space: pre; margin: 0; }
  .occurrence-count { display: inline-flex; align-items: center; justify-content: center; min-width: 1.375rem; height: 1.375rem; padding: 0 0.4375rem; font-size: 0.6875rem; font-weight: 700; color: var(--color-muted); background: var(--color-accent); border-radius: 9999px; }

  .occurrences-body { display: flex; flex-direction: column; }
  .occ-item { display: flex; flex-direction: column; gap: 0.625rem; padding: 1rem 1.5rem; }
  .occ-item:not(:last-child) { border-bottom: 1px solid var(--color-accent); }
  .occ-header { display: flex; align-items: center; gap: 0.875rem; flex-wrap: wrap; }
  .occ-time { font-size: 0.8125rem; font-weight: 500; color: var(--color-fg); }
  .occ-url { font-size: 0.75rem; color: var(--color-muted); font-family: "SF Mono", Monaco, Menlo, "Courier New", monospace; display: inline-flex; align-items: center; gap: 0.375rem; }
  .occ-method { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; color: var(--color-bg); background: var(--color-muted); padding: 0.0625rem 0.375rem; border-radius: 0.25rem; }
  .occ-context { font-size: 0.75rem; color: var(--color-muted); font-family: "SF Mono", Monaco, Menlo, "Courier New", monospace; background: var(--color-surface); padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid var(--color-accent); overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; line-height: 1.6; }
  .occ-details { margin: 0; }
  .occ-summary { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; font-weight: 500; color: var(--color-muted-light); cursor: pointer; user-select: none; transition: color 0.15s ease; list-style: none; }
  .occ-summary::-webkit-details-marker { display: none; }
  .occ-summary:hover { color: var(--color-muted); }
  .occ-details[open] .occ-summary svg { transform: rotate(90deg); }
  .occ-bt { font-size: 0.6875rem; color: var(--color-muted-lightest); font-family: "SF Mono", Monaco, Menlo, "Courier New", monospace; white-space: pre; overflow-x: auto; max-height: 200px; overflow-y: auto; margin: 0.5rem 0 0; padding: 0.75rem 1rem; background: var(--color-fg); border-radius: 0.5rem; line-height: 1.7; }
  .occ-empty { padding: 2rem 1.5rem; text-align: center; font-size: 0.875rem; color: var(--color-muted-light); }
</style>

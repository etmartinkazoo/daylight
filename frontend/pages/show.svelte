<script>
  import { router } from "@inertiajs/svelte";
  import DaylightLayout from "./DaylightLayout.svelte";
  import Badge from "@/components/ui/Badge.svelte";
  import Button from "@/components/ui/Button.svelte";
  import Table from "@/components/ui/Table.svelte";

  let { error = {}, occurrences = [] } = $props();

  function updateStatus(status) {
    router.patch(`/daylight/errors/${error.id}`, { status, filter_status: "open" });
  }

  function deleteError() {
    if (confirm("Delete this error and all occurrences?")) {
      router.delete(`/daylight/errors/${error.id}`);
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
  <div class="ew-show">
    <a href="/daylight/errors" class="ew-back">&larr; Back to errors</a>

    <!-- Error header -->
    <div class="ew-error-header">
      <div class="ew-error-top">
        <h1 class="ew-error-class">{error.error_class}</h1>
        <span class="ew-status" class:open={error.status === "open"} class:resolved={error.status === "resolved"} class:ignored={error.status === "ignored"}>
          {error.status}
        </span>
      </div>
      <p class="ew-error-msg">{error.message}</p>

      <div class="ew-meta-row">
        <div class="ew-meta">
          <span class="ew-meta-label">Occurrences</span>
          <span class="ew-meta-val">{error.occurrences_count}</span>
        </div>
        <div class="ew-meta">
          <span class="ew-meta-label">First seen</span>
          <span class="ew-meta-val">{formatTime(error.first_seen_at)}</span>
        </div>
        <div class="ew-meta">
          <span class="ew-meta-label">Last seen</span>
          <span class="ew-meta-val">{formatTime(error.last_seen_at)}</span>
        </div>
      </div>

      <div class="ew-actions">
        {#if error.status === "open"}
          <Button variant="outline" onclick={() => updateStatus("resolved")}>Resolve</Button>
          <Button variant="outline" onclick={() => updateStatus("ignored")}>Ignore</Button>
        {:else}
          <Button variant="outline" onclick={() => updateStatus("open")}>Reopen</Button>
        {/if}
        <Button variant="danger" onclick={deleteError}>Delete</Button>
      </div>
    </div>

    <!-- Backtrace -->
    {#if error.backtrace_summary}
      <section class="ew-section">
        <h2 class="ew-section-title">Backtrace</h2>
        <pre class="ew-backtrace">{error.backtrace_summary}</pre>
      </section>
    {/if}

    <!-- Occurrences -->
    <section class="ew-section">
      <h2 class="ew-section-title">Recent Occurrences ({occurrences.length})</h2>
      <div class="ew-occ-list">
        {#each occurrences as occ (occ.id)}
          <div class="ew-occ">
            <div class="ew-occ-header">
              <span class="ew-occ-time">{formatTime(occ.occurred_at)}</span>
              {#if occ.request_url}
                <span class="ew-occ-url">{occ.request_method} {occ.request_url}</span>
              {/if}
            </div>

            {#if occ.context && Object.keys(occ.context).length > 0}
              <pre class="ew-occ-context">{JSON.stringify(occ.context, null, 2)}</pre>
            {/if}

            {#if occ.backtrace}
              <details class="ew-occ-bt-details">
                <summary>Backtrace</summary>
                <pre class="ew-occ-bt">{occ.backtrace}</pre>
              </details>
            {/if}
          </div>
        {/each}
      </div>
    </section>
  </div>
</DaylightLayout>

<style>
  .ew-show {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .ew-back {
    font-size: 0.8125rem;
    color: #6b7280;
    text-decoration: none;
    &:hover { color: #213258; }
  }

  /* Error header */
  .ew-error-header {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 0;
  }

  .ew-error-top {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .ew-error-class {
    font-size: 1.125rem;
    font-weight: 700;
    color: #dc2626;
    margin: 0;
    word-break: break-word;
  }

  .ew-status {
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.125rem 0.5rem;
    border-radius: 0;

    &.open { background: #fef2f2; color: #dc2626; }
    &.resolved { background: #f0fdf4; color: #16a34a; }
    &.ignored { background: #f3f4f6; color: #9ca3af; }
  }

  .ew-error-msg {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
    word-break: break-word;
  }

  .ew-meta-row {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .ew-meta {
    display: flex;
    flex-direction: column;
    gap: 0.0625rem;
  }

  .ew-meta-label {
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #9ca3af;
  }

  .ew-meta-val {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #374151;
  }

  .ew-actions {
    display: flex;
    gap: 0.375rem;
  }

  .ew-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: inherit;
    border: 1px solid #d1d5db;
    border-radius: 0;
    background: #fff;
    color: #374151;
    cursor: pointer;
    transition: background 0.1s;

    &:hover { background: #f3f4f6; }
  }

  .ew-btn-danger {
    color: #dc2626;
    border-color: #fecaca;
    &:hover { background: #fef2f2; }
  }

  /* Sections */
  .ew-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .ew-section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin: 0;
  }

  .ew-backtrace {
    background: #1e293b;
    color: #e2e8f0;
    padding: 1rem;
    border-radius: 0;
    font-family: "SF Mono", Monaco, Menlo, "Courier New", monospace;
    font-size: 0.75rem;
    line-height: 1.7;
    overflow-x: auto;
    white-space: pre;
    margin: 0;
  }

  /* Occurrences */
  .ew-occ-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .ew-occ {
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 0;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .ew-occ-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .ew-occ-time {
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
  }

  .ew-occ-url {
    font-size: 0.75rem;
    color: #374151;
    font-family: monospace;
  }

  .ew-occ-context {
    font-size: 0.6875rem;
    color: #6b7280;
    font-family: monospace;
    background: #f9fafb;
    padding: 0.5rem;
    border-radius: 0;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
  }

  .ew-occ-bt-details {
    summary {
      font-size: 0.6875rem;
      color: #9ca3af;
      cursor: pointer;
      &:hover { color: #6b7280; }
    }
  }

  .ew-occ-bt {
    font-size: 0.6875rem;
    color: #6b7280;
    font-family: monospace;
    white-space: pre;
    overflow-x: auto;
    max-height: 150px;
    overflow-y: auto;
    margin: 0.375rem 0 0;
  }
</style>

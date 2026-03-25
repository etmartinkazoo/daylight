<script>
  let { tool = "", message = "", arguments: args, status = "running", result = "" } = $props();
  let expanded = $state(false);

  let toolLabel = $derived({
    query: "Search",
    details: "Lookup",
    project_summary: "Project Summary",
    milestone_todos: "Milestone Todos",
    find_similar_todos: "Find Similar",
    project_reorg: "Reorganize",
    github_search: "Code Search",
    github_read_file: "Read File",
    browse_url: "Browse URL",
  }[tool] || tool);

  let toolIcon = $derived(status === "running" ? "running" : status === "error" ? "error" : "done");
</script>

<button class="tool-card" class:done={status === "done"} class:error={status === "error"} onclick={() => expanded = !expanded}>
  <div class="tool-header">
    <span class="tool-icon">
      {#if toolIcon === "running"}
        <svg class="tool-spinner-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="8" cy="8" r="6" stroke-dasharray="28 10" />
        </svg>
      {:else if toolIcon === "error"}
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M6 6l4 4M10 6l-4 4"/></svg>
      {:else}
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M5.5 8.5l2 2 3.5-4"/></svg>
      {/if}
    </span>
    <span class="tool-name">{toolLabel}</span>
    <span class="tool-desc">{message}</span>
    {#if result && status !== "running"}
      <span class="tool-result">{result}</span>
    {/if}
    <svg class="tool-chevron" class:open={expanded} viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 4.5L6 7.5L9 4.5"/></svg>
  </div>

  {#if expanded && args}
    <div class="tool-details">
      {#each Object.entries(args) as [key, val]}
        <div class="tool-arg">
          <span class="tool-arg-key">{key}</span>
          <span class="tool-arg-val">{typeof val === "object" ? JSON.stringify(val) : val}</span>
        </div>
      {/each}
    </div>
  {/if}
</button>

<style>
  .tool-card {
    display: flex;
    flex-direction: column;
    width: 100%;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    transition: background 0.1s;

    &:hover { background: var(--color-accent); }
    &.error { border-color: var(--color-danger); }
  }

  .tool-header {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    min-height: 1.75rem;
  }

  .tool-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;

    svg { width: 1rem; height: 1rem; }
  }

  .tool-spinner-icon { animation: tool-spin 0.8s linear infinite; }
  @keyframes tool-spin { to { transform: rotate(360deg); } }

  .done .tool-icon { color: var(--color-success, #16a34a); }
  .error .tool-icon { color: var(--color-danger); }

  .tool-name {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-fg);
    flex-shrink: 0;
  }

  .tool-desc {
    font-size: 0.6875rem;
    color: var(--color-muted);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tool-result {
    font-size: 0.6875rem;
    color: var(--color-muted);
    flex-shrink: 0;
  }

  .tool-chevron {
    width: 0.75rem;
    height: 0.75rem;
    color: var(--color-muted);
    flex-shrink: 0;
    transition: transform 0.15s;

    &.open { transform: rotate(180deg); }
  }

  .tool-details {
    padding: 0.25rem 0.625rem 0.5rem;
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .tool-arg {
    display: flex;
    gap: 0.375rem;
    font-size: 0.6875rem;
  }

  .tool-arg-key {
    font-family: "SF Mono", "Cascadia Code", monospace;
    font-weight: 600;
    color: var(--color-primary);
    flex-shrink: 0;
  }

  .tool-arg-val {
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

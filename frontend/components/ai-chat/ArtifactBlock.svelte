<script>
  let {
    title = "",
    description = "",
    type = "document",
    children,
    actions,
  } = $props();

  let expanded = $state(true);

  let typeIcon = $derived({
    document: "D",
    code: "<>",
    plan: "P",
    note: "N",
    table: "T",
  }[type] || "A");

  let typeLabel = $derived({
    document: "Document",
    code: "Code",
    plan: "Plan",
    note: "Note",
    table: "Table",
  }[type] || "Artifact");
</script>

<div class="artifact" class:collapsed={!expanded}>
  <div class="artifact-header">
    <div class="artifact-title-area">
      <span class="artifact-badge">{typeIcon}</span>
      <div class="artifact-meta">
        <span class="artifact-title">{title || typeLabel}</span>
        {#if description}
          <span class="artifact-desc">{description}</span>
        {/if}
      </div>
    </div>
    <div class="artifact-actions">
      {#if actions}
        {@render actions()}
      {/if}
      <button class="artifact-toggle" onclick={() => expanded = !expanded} title={expanded ? "Collapse" : "Expand"}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class:rotated={!expanded}>
          <path d="M4 6l4 4 4-4"/>
        </svg>
      </button>
    </div>
  </div>

  <div class="artifact-collapse" class:open={expanded}>
    <div class="artifact-collapse-inner">
      <div class="artifact-content">
        {#if children}
          {@render children()}
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .artifact {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    margin-top: 0.5rem;
  }

  .artifact-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    background: var(--color-accent);
    border-bottom: 1px solid var(--color-border);
  }

  .collapsed .artifact-header { border-bottom: none; }

  .artifact-title-area {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .artifact-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: calc(var(--radius-sm) * 0.5);
    background: var(--color-primary);
    color: var(--color-primary-fg);
    font-size: 0.5625rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .artifact-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .artifact-title {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-fg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .artifact-desc {
    font-size: 0.625rem;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .artifact-actions {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .artifact-actions :global(button) {
    font-size: 0.6875rem;
  }

  .artifact-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    background: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--color-muted);
    transition: all 0.1s;

    svg { width: 0.875rem; height: 0.875rem; transition: transform 0.2s; }
    svg.rotated { transform: rotate(-90deg); }
    &:hover { background: var(--color-bg); color: var(--color-fg); }
  }

  .artifact-collapse {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.2s ease;
    &.open { grid-template-rows: 1fr; }
  }

  .artifact-collapse-inner { overflow: hidden; }

  .artifact-content {
    padding: 0.625rem;
    font-size: 0.8125rem;
    line-height: 1.6;
    max-height: 24rem;
    overflow-y: auto;
  }

  /* Markdown content inside artifacts */
  .artifact-content :global(p) { margin: 0.25rem 0; }
  .artifact-content :global(ul), .artifact-content :global(ol) { padding-left: 1.25rem; margin: 0.25rem 0; }
  .artifact-content :global(li) { margin: 0.125rem 0; }
  .artifact-content :global(code) {
    font-size: 0.75rem; font-family: "SF Mono", monospace;
    background: var(--color-accent); padding: 0.0625rem 0.25rem;
    border-radius: 2px; border: 1px solid var(--color-border);
  }
  .artifact-content :global(pre) {
    overflow-x: auto; padding: 0.5rem 0.75rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: var(--radius-sm); font-size: 0.75rem; margin: 0.375rem 0;
  }
  .artifact-content :global(pre code) { background: none; border: none; padding: 0; }
  .artifact-content :global(strong) { font-weight: 600; }
  .artifact-content :global(h1), .artifact-content :global(h2), .artifact-content :global(h3) {
    font-weight: 600; margin: 0.5rem 0 0.25rem;
  }
  .artifact-content :global(table) {
    width: 100%; border-collapse: collapse; font-size: 0.75rem; margin: 0.375rem 0;
  }
  .artifact-content :global(th) { text-align: left; font-weight: 600; padding: 0.25rem 0.5rem; border-bottom: 2px solid var(--color-border); }
  .artifact-content :global(td) { padding: 0.25rem 0.5rem; border-bottom: 1px solid var(--color-border); }
</style>

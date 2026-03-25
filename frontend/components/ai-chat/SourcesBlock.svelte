<script>
  let { sources = [] } = $props();
  let expanded = $state(false);
</script>

{#if sources.length > 0}
  <div class="sources">
    <button class="sources-trigger" onclick={() => expanded = !expanded}>
      <svg class="sources-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M2 4h12M2 8h8M2 12h10"/>
      </svg>
      <span>Used {sources.length} source{sources.length !== 1 ? "s" : ""}</span>
      <svg class="sources-chevron" class:open={expanded} viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M3 4.5L6 7.5L9 4.5"/>
      </svg>
    </button>

    <div class="sources-collapse" class:open={expanded}>
      <div class="sources-collapse-inner">
        <div class="sources-list">
          {#each sources as source}
            {#if source.url}
              <a href={source.url} class="source-item" target="_blank" rel="noopener noreferrer">
                <span class="source-badge" style="--source-color: {source.color || 'var(--color-muted)'}">
                  {source.icon || source.type?.charAt(0) || "?"}
                </span>
                <div class="source-info">
                  <span class="source-title">{source.title}</span>
                  {#if source.detail}
                    <span class="source-detail">{source.detail}</span>
                  {/if}
                </div>
              </a>
            {:else}
              <div class="source-item">
                <span class="source-badge" style="--source-color: {source.color || 'var(--color-muted)'}">
                  {source.icon || source.type?.charAt(0) || "?"}
                </span>
                <div class="source-info">
                  <span class="source-title">{source.title}</span>
                  {#if source.detail}
                    <span class="source-detail">{source.detail}</span>
                  {/if}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .sources {
    margin-top: 0.375rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .sources-trigger {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
    padding: 0.3125rem 0.625rem;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--color-muted);
    text-align: left;

    &:hover { color: var(--color-fg); }
  }

  .sources-icon { width: 0.75rem; height: 0.75rem; flex-shrink: 0; }

  .sources-chevron {
    width: 0.75rem; height: 0.75rem; flex-shrink: 0;
    margin-left: auto; transition: transform 0.2s;
    &.open { transform: rotate(180deg); }
  }

  .sources-collapse {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.2s ease;
    &.open { grid-template-rows: 1fr; }
  }

  .sources-collapse-inner { overflow: hidden; }

  .sources-list {
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--color-border);
  }

  .source-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.625rem;
    border-bottom: 1px solid var(--color-border);
    text-decoration: none;
    color: inherit;
    transition: background 0.1s;

    &:last-child { border-bottom: none; }
    &:hover { background: var(--color-accent); }
  }

  a.source-item { cursor: pointer; }

  .source-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: calc(var(--radius-sm) * 0.5);
    background: var(--source-color);
    color: white;
    font-size: 0.5625rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .source-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .source-title {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-fg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .source-detail {
    font-size: 0.625rem;
    color: var(--color-muted);
  }
</style>

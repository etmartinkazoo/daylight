<script>
  let { suggestions = [], onSelect } = $props();
</script>

{#if suggestions.length > 0}
  <div class="suggestions">
    {#each suggestions as s}
      <button class="suggestion" onclick={() => onSelect?.(s)}>
        {s}
      </button>
    {/each}
  </div>
{/if}

<style>
  .suggestions {
    display: flex;
    gap: 0.375rem;
    flex-wrap: wrap;
    padding: 0.25rem 0;
  }

  .suggestion {
    font-size: 0.6875rem;
    font-family: inherit;
    font-weight: 500;
    padding: 0.25rem 0.625rem;
    border: 1px solid var(--color-border);
    border-radius: 9999px;
    background: var(--color-bg);
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.1s;
    white-space: nowrap;

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: var(--color-primary-subtle);
    }
  }
</style>

<script>
  import Button from "./Button.svelte";

  let { count = 0, actions = [], oncancel } = $props();
</script>

{#if count > 0}
  <div class="bulk-bar">
    <div class="bulk-indicator"></div>
    <span class="bulk-count">{count} selected</span>
    <div class="bulk-actions">
      {#each actions as action}
        <Button variant={action.variant || "outline"} onclick={action.onclick}>{action.label}</Button>
      {/each}
      <Button variant="outline" onclick={oncancel}>Cancel</Button>
    </div>
  </div>
{/if}

<style>
  .bulk-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 1rem;
    background: var(--color-fg);
    color: var(--color-bg);
    border-radius: var(--radius-lg);
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

  .bulk-count {
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
</style>

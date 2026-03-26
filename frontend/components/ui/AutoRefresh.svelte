<script>
  /**
   * Auto-refresh toggle with interval selection
   * @type {{ interval?: number }}
   */
  let { interval = $bindable(0) } = $props();

  const options = [
    { value: 0, label: "Off" },
    { value: 5000, label: "5s" },
    { value: 10000, label: "10s" },
    { value: 30000, label: "30s" },
    { value: 60000, label: "60s" },
  ];

  let active = $derived(interval > 0);
</script>

<div class="auto-refresh">
  {#if active}
    <span class="pulse-dot"></span>
  {/if}
  <div class="pill-group">
    {#each options as opt (opt.value)}
      <button
        class="pill-btn"
        class:active={interval === opt.value}
        onclick={() => (interval = opt.value)}
      >{opt.label}</button>
    {/each}
  </div>
</div>

<style>
  .auto-refresh {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .pulse-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--color-success);
    flex-shrink: 0;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-success) 40%, transparent); }
    50% { opacity: 0.7; box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-success) 0%, transparent); }
  }

  .pill-group {
    display: flex;
    background: var(--color-accent);
    border-radius: 0.5rem;
    padding: 0.1875rem;
    gap: 0.125rem;
  }

  .pill-btn {
    padding: 0.3125rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: inherit;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover { color: var(--color-fg); }
    &.active {
      background: var(--color-bg);
      color: var(--color-fg);
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }
  }
</style>

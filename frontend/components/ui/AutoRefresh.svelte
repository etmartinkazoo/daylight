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
    background: #22c55e;
    flex-shrink: 0;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgb(34 197 94 / 0.4); }
    50% { opacity: 0.7; box-shadow: 0 0 0 4px rgb(34 197 94 / 0); }
  }

  .pill-group {
    display: flex;
    background: #f1f5f9;
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
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover { color: #0f172a; }
    &.active {
      background: #fff;
      color: #0f172a;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }
  }
</style>

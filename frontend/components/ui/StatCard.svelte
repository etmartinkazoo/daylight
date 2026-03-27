<script>
let { label, value, color = "", danger = false } = $props();
</script>

<div class="stat-card" class:stat-card-danger={danger}>
  <span class="stat-card-label">{label}</span>
  <span class="stat-card-value" class:stat-value-danger={danger} style={color ? `color: ${color}` : ""}>
    {value}
  </span>
</div>

<style>
  .stat-card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    transition: border-color 0.15s, box-shadow 0.15s;

    &:hover {
      box-shadow: var(--shadow-md);
    }
  }

  .stat-card-danger {
    border-color: var(--color-danger-border);
  }

  .stat-card-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-muted);
  }

  .stat-card-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-fg);
    letter-spacing: -0.02em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .stat-value-danger {
    color: var(--color-danger);
  }
</style>

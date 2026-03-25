<script>
let { variant = "default", children, ...rest } = $props();
</script>

<span class="badge badge-{variant}" {...rest}>
  {@render children()}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.625rem;
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1.25rem;
    border-radius: 9999px;
    border: 1px solid transparent;
    white-space: nowrap;
    letter-spacing: 0.01em;
  }

  .badge-default {
    background: var(--color-primary);
    color: var(--color-primary-fg);
  }

  .badge-secondary {
    background: var(--color-accent);
    color: var(--color-fg);
    border-color: var(--color-border);
  }

  .badge-outline {
    background: transparent;
    color: var(--color-muted);
    border-color: var(--color-border);
  }

  .badge-destructive {
    background: var(--color-danger-subtle);
    color: var(--color-danger);
    border-color: color-mix(in srgb, var(--color-danger) 20%, transparent);
  }

  .badge-success {
    background: var(--color-success-subtle);
    color: var(--color-success);
    border-color: color-mix(in srgb, var(--color-success) 20%, transparent);
  }
</style>

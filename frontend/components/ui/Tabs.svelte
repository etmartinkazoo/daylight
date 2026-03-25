<script>
let { value = $bindable(""), children } = $props();
</script>

<div class="tabs">
  {@render children(value, (v) => value = v)}
</div>

<style>
  .tabs {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .tabs :global(.tabs-list) {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--color-border);
    padding: 0 1rem;
  }

  .tabs :global(.tabs-trigger) {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-muted);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    margin-bottom: -1px;
    transition: color var(--duration-normal) var(--ease-default), border-color var(--duration-normal) var(--ease-default);
    white-space: nowrap;

    &:hover {
      color: var(--color-fg);
    }

    &:focus-visible {
      outline: none;
      color: var(--color-fg);
      border-bottom-color: var(--color-focus);
    }
  }

  .tabs :global(.tabs-trigger.active) {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
  }

  .tabs :global(.tabs-trigger svg) {
    opacity: 0.6;
  }

  .tabs :global(.tabs-trigger.active svg) {
    opacity: 1;
  }
</style>

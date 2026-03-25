<script>
let { children } = $props();
</script>

<div class="card">
  {@render children()}
</div>

<style>
  .card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-bg);
    box-shadow: var(--shadow-sm);
    transition: box-shadow var(--duration-normal) var(--ease-default);

    &:hover {
      box-shadow: var(--shadow-md);
    }
  }

  .card :global(.card-header) {
    padding: 1.5rem 1.5rem 0;
  }

  .card :global(.card-title) {
    font-size: 0.9375rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--color-fg);
  }

  .card :global(.card-description) {
    font-size: 0.8125rem;
    color: var(--color-muted);
    margin-top: 0.125rem;
  }

  .card :global(.card-content) {
    padding: 1.5rem;
  }
</style>

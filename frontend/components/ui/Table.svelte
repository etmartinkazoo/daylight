<script>
let { children } = $props();
</script>

<div class="table-scroll">
  <table class="table">
    {@render children()}
  </table>
</div>

<style>
  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .table {
    width: 100%;
    font-size: 0.875rem;
    text-align: left;
    border-spacing: 0;
    min-width: max-content;
  }

  .table :global(thead) {
    background: var(--color-surface);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .table :global(th) {
    padding: 0.4375rem 0.75rem;
    font-weight: 500;
    font-size: 0.8125rem;
    color: var(--color-muted);
    border-bottom: 1px solid var(--color-border);
    letter-spacing: 0.01em;
    white-space: nowrap;
    vertical-align: middle;
  }

  .table :global(td) {
    padding: 0.4375rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-fg);
    vertical-align: middle;
  }

  .table :global(tbody tr) {
    transition: background var(--duration-fast) var(--ease-default);
  }

  .table :global(tbody tr:hover) {
    background: var(--color-surface);
  }

  .table :global(tr:last-child td) {
    border-bottom: none;
  }

  .table :global(.text-right) {
    text-align: right;
  }

  .table :global(.font-medium) {
    font-weight: 500;
  }

  .table :global(.text-muted) {
    color: var(--color-muted);
  }

  @media (max-width: 768px) {
    .table :global(td) {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
  }
</style>

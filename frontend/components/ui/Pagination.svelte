<script>
import { router } from "@inertiajs/svelte";

let { pagination = null } = $props();
let currentPage = $derived(pagination?.current_page || 1);
let totalPages = $derived(pagination?.total_pages || 1);
let totalCount = $derived(pagination?.total_count || 0);
let perPage = $derived(pagination?.per_page || 20);

// Build page numbers to show
let pageNumbers = $derived.by(() => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [];
  pages.push(1);

  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push(null); // ellipsis
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push(null); // ellipsis

  pages.push(totalPages);
  return pages;
});

function goToPage(p) {
  const url = new URL(window.location.href);
  if (p <= 1) {
    url.searchParams.delete("page");
  } else {
    url.searchParams.set("page", p);
  }
  router.get(url.pathname, Object.fromEntries(url.searchParams), {
    preserveScroll: true,
    replace: true,
  });
}

let fromItem = $derived((currentPage - 1) * perPage + 1);
let toItem = $derived(Math.min(currentPage * perPage, totalCount));
</script>

{#if totalPages > 1}
  <div class="pagination">
    <span class="pagination-info">
      {fromItem}–{toItem} of {totalCount}
    </span>

    <div class="pagination-controls">
      <button
        class="page-btn nav-btn"
        disabled={currentPage <= 1}
        onclick={() => goToPage(currentPage - 1)}
        aria-label="Previous page"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 3.5L5 7l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>

      {#each pageNumbers as p}
        {#if p === null}
          <span class="page-ellipsis">&hellip;</span>
        {:else}
          <button
            class="page-btn"
            class:active={p === currentPage}
            onclick={() => goToPage(p)}
          >
            {p}
          </button>
        {/if}
      {/each}

      <button
        class="page-btn nav-btn"
        disabled={currentPage >= totalPages}
        onclick={() => goToPage(currentPage + 1)}
        aria-label="Next page"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 3.5L9 7l-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </div>
{/if}

<style>
  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0;
  }

  .pagination-info {
    font-size: 0.8125rem;
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: inherit;
    font-variant-numeric: tabular-nums;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    color: var(--color-fg);
    cursor: pointer;
    transition: all var(--duration-normal) var(--ease-default);

    &:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }

    &:hover:not(:disabled):not(.active) {
      background: var(--color-accent);
      border-color: var(--color-input-border);
    }

    &.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-primary-fg);
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }

  .nav-btn {
    padding: 0;
  }

  .page-ellipsis {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    height: 2rem;
    font-size: 0.8125rem;
    color: var(--color-muted);
    user-select: none;
  }
</style>

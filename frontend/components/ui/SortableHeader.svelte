<script>
import { router } from "@inertiajs/svelte";

let { column, label, class: className = "", sort_column = null, sort_direction = null } = $props();

let currentSort = $derived(sort_column);
let currentDir = $derived(sort_direction);
let isActive = $derived(currentSort === column);

function handleClick() {
  const nextDir = isActive && currentDir === "asc" ? "desc" : "asc";

  const url = new URL(window.location.href);
  url.searchParams.set("sort", column);
  url.searchParams.set("direction", nextDir);

  router.get(url.pathname, Object.fromEntries(url.searchParams), {
    preserveScroll: true,
    replace: true,
  });
}
</script>

<button class="sortable-th {className}" class:active={isActive} onclick={handleClick}>
  <span class="sortable-label">{label}</span>
  {#if isActive}
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="sort-arrow">
      {#if currentDir === "asc"}
        <path d="M6 2.5L9.5 7H2.5L6 2.5Z" fill="currentColor"/>
      {:else}
        <path d="M6 9.5L2.5 5H9.5L6 9.5Z" fill="currentColor"/>
      {/if}
    </svg>
  {/if}
</button>

<style>
  .sortable-th {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-weight: 500;
    font-size: 0.8125rem;
    color: var(--color-muted);
    cursor: pointer;
    white-space: nowrap;
    letter-spacing: 0.01em;
    transition: color 0.15s ease;
    user-select: none;

    &:hover {
      color: var(--color-fg);
    }

    &.active {
      color: var(--color-fg);
    }
  }

  .sort-arrow {
    flex-shrink: 0;
    opacity: 0.5;
  }

  .sortable-th.active .sort-arrow {
    opacity: 1;
  }
</style>

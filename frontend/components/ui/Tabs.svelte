<script>
  import { Link } from "@inertiajs/svelte";

  let {
    value = $bindable(""),
    tabs = [],
    href = "",
    data = {},
    counts = {},
    extra,
  } = $props();
</script>

<div class="tabs">
  <div class="tabs-list">
    {#each tabs as tab (tab.key)}
      <Link
        {href}
        data={{ ...data, status: tab.key }}
        preserveState={true}
        class="tabs-trigger {value === tab.key ? 'active' : ''}"
        onclick={() => (value = tab.key)}
      >
        {tab.label}
        {#if tab.key !== "all" && counts[tab.key]}
          <span class="tabs-count">{counts[tab.key]}</span>
        {/if}
      </Link>
    {/each}
    {#if extra}
      <div class="tabs-extra">
        {@render extra()}
      </div>
    {/if}
  </div>
</div>

<style>
  .tabs {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .tabs-list {
    display: flex;
    align-items: center;
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
    transition:
      color var(--duration-normal) var(--ease-default),
      border-color var(--duration-normal) var(--ease-default);
    white-space: nowrap;

    &:hover {
      color: var(--color-fg);
    }

    &:focus-visible {
      outline: none;
      color: var(--color-fg);
      border-bottom-color: var(--color-focus);
    }

    &.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }

    svg {
      opacity: 0.6;
    }

    &.active svg {
      opacity: 1;
    }
  }

  .tabs-count {
    font-size: 0.75rem;
    font-weight: 600;
    background: var(--color-accent);
    color: var(--color-muted);
    padding: 0.1rem 0.45rem;
    border-radius: var(--radius-full);
  }

  .tabs-extra {
    margin-left: auto;
    display: flex;
    gap: 0.5rem;
    padding-bottom: 0.25rem;
  }
</style>

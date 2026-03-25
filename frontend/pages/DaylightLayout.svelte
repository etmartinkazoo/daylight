<script>
import { usePage } from "@inertiajs/svelte";

let { children } = $props();
const pageStore = usePage();
let url = $derived($pageStore.url?.split("?")[0] || "");

const nav = [
  { label: "Errors", href: "/daylight/errors", match: "/daylight/errors" },
  {
    label: "Requests",
    href: "/daylight/requests",
    match: "/daylight/requests",
  },
  {
    label: "Queries",
    href: "/daylight/queries",
    match: "/daylight/queries",
  },
  { label: "Jobs", href: "/daylight/jobs", match: "/daylight/jobs" },
  { label: "Settings", href: "/daylight/settings", match: "/daylight/settings" },
  { label: "Solid Queue", href: "/solid_queue", external: true },
];

function isActive(item) {
  if (item.match)
    return (
      url.startsWith(item.match) ||
      (url === "/daylight" && item.match === "/daylight/errors")
    );
  return false;
}
</script>

<div class="ew-shell">
  <div class="ew-sidebar">
    <div class="ew-brand">
      <a href="/daylight" class="ew-brand-link">
        <span class="ew-brand-mark">E</span>
        <span class="ew-brand-name">Daylight</span>
      </a>
    </div>

    <nav class="ew-nav">
      {#each nav as item (item.label)}
        {#if item.external}
          <a href={item.href} class="ew-nav-item" target="_blank" rel="noopener">
            {item.label}
            <svg class="ew-external" viewBox="0 0 12 12" fill="none"><path d="M4 1h7v7M11 1L5 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        {:else}
          <a href={item.href} class="ew-nav-item" class:active={isActive(item)}>
            {item.label}
          </a>
        {/if}
      {/each}
    </nav>

    <div class="ew-sidebar-footer">
      <a href="/" class="ew-back-link">&larr; Back to app</a>
    </div>
  </div>

  <main class="ew-main">
    {@render children()}
  </main>
</div>

<style>
  :global(html), :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    background: #fff !important;
    color: #1e293b;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  :global(*, *::before, *::after) { box-sizing: border-box; }

  .ew-shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .ew-sidebar {
    width: 200px;
    background: #f9fafb;
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .ew-brand { padding: 1.25rem 1rem 1rem; }

  .ew-brand-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: #213258;
  }

  .ew-brand-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.625rem;
    height: 1.625rem;
    background: #213258;
    border-radius: 0;
    font-size: 0.8125rem;
    font-weight: 800;
    color: #fff;
  }

  .ew-brand-name {
    font-size: 0.875rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .ew-nav {
    display: flex;
    flex-direction: column;
    padding: 0.5rem;
    gap: 1px;
    flex: 1;
  }

  .ew-nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #6b7280;
    text-decoration: none;
    border-radius: 0;
    transition: background 0.1s, color 0.1s;

    &:hover { background: #e5e7eb; color: #1e293b; }
    &.active { background: #213258; color: #fff; font-weight: 600; }
  }

  .ew-external {
    width: 10px;
    height: 10px;
    opacity: 0.4;
    margin-left: auto;
  }

  .ew-sidebar-footer {
    padding: 0.75rem 1rem;
    border-top: 1px solid #e5e7eb;
  }

  .ew-back-link {
    font-size: 0.75rem;
    color: #9ca3af;
    text-decoration: none;
    &:hover { color: #213258; }
  }

  .ew-main {
    flex: 1;
    padding: 1.5rem;
    min-width: 0;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
    .ew-shell { flex-direction: column; }
    .ew-sidebar {
      width: 100%;
      flex-direction: row;
      align-items: center;
      padding: 0;
      border-right: none;
      border-bottom: 1px solid #e5e7eb;
    }
    .ew-brand { padding: 0.5rem 1rem; }
    .ew-nav { flex-direction: row; padding: 0 0.5rem; gap: 0; overflow-x: auto; }
    .ew-nav-item { white-space: nowrap; padding: 0.5rem 0.625rem; }
    .ew-sidebar-footer { display: none; }
    .ew-main { padding: 1rem; }
  }
</style>

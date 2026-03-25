<script>
import { usePage } from "@inertiajs/svelte";

let { children } = $props();
const pageStore = usePage();
let url = $derived($pageStore.url?.split("?")[0] || "");
let base = $derived($pageStore.props?.base_path || "/daylight");

let nav = $derived([
  { label: "Errors", href: `${base}/errors`, match: `${base}/errors`, icon: "errors" },
  { label: "Requests", href: `${base}/requests`, match: `${base}/requests`, icon: "requests" },
  { label: "Queries", href: `${base}/queries`, match: `${base}/queries`, icon: "queries" },
  { label: "Jobs", href: `${base}/jobs`, match: `${base}/jobs`, icon: "jobs" },
  { label: "Health", href: `${base}/health`, match: `${base}/health`, icon: "health" },
  { label: "Settings", href: `${base}/settings`, match: `${base}/settings`, icon: "settings" },
]);

function isActive(item) {
  if (item.match)
    return (
      url.startsWith(item.match) ||
      (url === base && item.match === `${base}/errors`)
    );
  return false;
}
</script>

<div class="ew-shell">
  <div class="ew-sidebar">
    <div class="ew-brand">
      <a href={base} class="ew-brand-link">
        <span class="ew-brand-mark">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </span>
        <span class="ew-brand-name">Daylight</span>
      </a>
    </div>

    <nav class="ew-nav">
      {#each nav as item (item.label)}
        <a href={item.href} class="ew-nav-item" class:active={isActive(item)}>
          <svg class="ew-nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            {#if item.icon === "errors"}
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            {:else if item.icon === "requests"}
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            {:else if item.icon === "queries"}
              <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            {:else if item.icon === "jobs"}
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 3h-8l-2 4h12z"/>
            {:else if item.icon === "health"}
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            {:else if item.icon === "settings"}
              <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            {/if}
          </svg>
          {item.label}
        </a>
      {/each}
    </nav>

    <div class="ew-sidebar-footer">
      <a href="/" class="ew-back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back to app
      </a>
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
    background: #f8fafc !important;
    color: #0f172a;
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
    width: 220px;
    background: #ffffff;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .ew-brand { padding: 1.5rem 1.25rem 1.25rem; }

  .ew-brand-link {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    text-decoration: none;
    color: #0f172a;
  }

  .ew-brand-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: linear-gradient(135deg, #f59e0b, #f97316);
    border-radius: 0.5rem;
    color: #fff;
  }

  .ew-brand-name {
    font-size: 0.9375rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .ew-nav {
    display: flex;
    flex-direction: column;
    padding: 0.25rem 0.75rem;
    gap: 2px;
    flex: 1;
  }

  .ew-nav-item {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #64748b;
    text-decoration: none;
    border-radius: 0.5rem;
    transition: all 0.15s ease;

    &:hover { background: #f1f5f9; color: #0f172a; }
    &.active {
      background: #0f172a;
      color: #fff;
      font-weight: 600;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }
  }

  .ew-nav-icon {
    flex-shrink: 0;
    opacity: 0.7;
  }

  .ew-nav-item.active .ew-nav-icon { opacity: 1; }

  .ew-sidebar-footer {
    padding: 1rem 1.25rem;
    border-top: 1px solid #e2e8f0;
  }

  .ew-back-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: #94a3b8;
    text-decoration: none;
    &:hover { color: #0f172a; }
  }

  .ew-main {
    flex: 1;
    padding: 2rem;
    min-width: 0;
    overflow-y: auto;
    background: #f8fafc;
  }

  @media (max-width: 768px) {
    .ew-shell { flex-direction: column; }
    .ew-sidebar {
      width: 100%;
      flex-direction: row;
      align-items: center;
      padding: 0;
      border-right: none;
      border-bottom: 1px solid #e2e8f0;
    }
    .ew-brand { padding: 0.625rem 1rem; }
    .ew-nav { flex-direction: row; padding: 0 0.5rem; gap: 0; overflow-x: auto; }
    .ew-nav-item { white-space: nowrap; padding: 0.5rem 0.625rem; border-radius: 0.375rem; }
    .ew-nav-icon { display: none; }
    .ew-sidebar-footer { display: none; }
    .ew-main { padding: 1.25rem; }
  }
</style>

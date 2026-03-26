<script>
import { usePage } from "@inertiajs/svelte";

let { children } = $props();
const pageStore = usePage();
let url = $derived($pageStore.url?.split("?")[0] || "");
let base = $derived($pageStore.props?.base_path || "/daylight");

let nav = $derived([
  { label: "Errors", href: `${base}/errors`, match: `${base}/errors`, icon: "errors" },
  { label: "Incidents", href: `${base}/incidents`, match: `${base}/incidents`, icon: "incidents" },
  { label: "Requests", href: `${base}/requests`, match: `${base}/requests`, icon: "requests" },
  { label: "Queries", href: `${base}/queries`, match: `${base}/queries`, icon: "queries" },
  { label: "Jobs", href: `${base}/jobs`, match: `${base}/jobs`, icon: "jobs" },
  { label: "Logs", href: `${base}/logs`, match: `${base}/logs`, icon: "logs" },
  { label: "HTTP", href: `${base}/http_requests`, match: `${base}/http_requests`, icon: "http" },
  { label: "Cache", href: `${base}/cache`, match: `${base}/cache`, icon: "cache" },
  { label: "Scheduled", href: `${base}/scheduled_tasks`, match: `${base}/scheduled_tasks`, icon: "scheduled" },
  { label: "Mail", href: `${base}/mail_events`, match: `${base}/mail_events`, icon: "mail" },
  { label: "Health", href: `${base}/health`, match: `${base}/health`, icon: "health" },
  { label: "Settings", href: `${base}/settings`, match: `${base}/settings`, icon: "settings" },
]);

// Group nav into sections
let primaryNav = $derived(nav.slice(0, 6));
let secondaryNav = $derived(nav.slice(6, 10));
let utilNav = $derived(nav.slice(10));

function isActive(item) {
  if (item.match)
    return (
      url.startsWith(item.match) ||
      (url === base && item.match === `${base}/errors`)
    );
  return false;
}
</script>

<div class="shell">
  <aside class="sidebar">
    <div class="brand">
      <a href={base} class="brand-link">
        <span class="brand-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        </span>
        <span class="brand-name">Daylight</span>
      </a>
    </div>

    <nav class="nav">
      <div class="nav-group">
        {#each primaryNav as item (item.label)}
          <a href={item.href} class="nav-item" class:active={isActive(item)}>
            <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              {#if item.icon === "errors"}
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              {:else if item.icon === "incidents"}
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              {:else if item.icon === "requests"}
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              {:else if item.icon === "queries"}
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              {:else if item.icon === "jobs"}
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 3h-8l-2 4h12z"/>
              {:else if item.icon === "logs"}
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              {/if}
            </svg>
            <span class="nav-label">{item.label}</span>
          </a>
        {/each}
      </div>

      <div class="nav-divider"></div>

      <div class="nav-group">
        <span class="nav-section-label">Infrastructure</span>
        {#each secondaryNav as item (item.label)}
          <a href={item.href} class="nav-item" class:active={isActive(item)}>
            <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              {#if item.icon === "http"}
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              {:else if item.icon === "cache"}
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M21 5v4c0 1.66-4 3-9 3s-9-1.34-9-3V5"/>
              {:else if item.icon === "scheduled"}
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              {:else if item.icon === "mail"}
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              {/if}
            </svg>
            <span class="nav-label">{item.label}</span>
          </a>
        {/each}
      </div>

      <div class="nav-divider"></div>

      <div class="nav-group">
        {#each utilNav as item (item.label)}
          <a href={item.href} class="nav-item" class:active={isActive(item)}>
            <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              {#if item.icon === "health"}
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              {:else if item.icon === "settings"}
                <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              {/if}
            </svg>
            <span class="nav-label">{item.label}</span>
          </a>
        {/each}
      </div>
    </nav>

    <div class="sidebar-footer">
      <a href="/" class="back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back to app
      </a>
    </div>
  </aside>

  <main class="main">
    {@render children()}
  </main>
</div>

<style>
  /* ——— Reset & Foundation ——— */
  :global(html), :global(body) {
    margin: 0;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    background: #f4f5f7 !important;
    color: #0f172a;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    letter-spacing: -0.006em;
  }

  :global(*, *::before, *::after) { box-sizing: border-box; }

  /* Premium scrollbar */
  :global(::-webkit-scrollbar) { width: 6px; height: 6px; }
  :global(::-webkit-scrollbar-track) { background: transparent; }
  :global(::-webkit-scrollbar-thumb) { background: rgba(0, 0, 0, 0.12); border-radius: 10px; }
  :global(::-webkit-scrollbar-thumb:hover) { background: rgba(0, 0, 0, 0.2); }

  .shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  /* ——— Sidebar ——— */
  .sidebar {
    width: 224px;
    background: #fff;
    border-right: 1px solid rgba(0, 0, 0, 0.06);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .brand {
    padding: 1.25rem 1rem 1rem;
  }

  .brand-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: #0f172a;
  }

  .brand-mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.125rem;
    height: 2.125rem;
    background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
    border-radius: 0.625rem;
    color: #fff;
    box-shadow: 0 1px 3px rgba(249, 115, 22, 0.3);
  }

  .brand-name {
    font-size: 0.9375rem;
    font-weight: 700;
    letter-spacing: -0.025em;
  }

  /* ——— Navigation ——— */
  .nav {
    display: flex;
    flex-direction: column;
    padding: 0.25rem 0.625rem;
    flex: 1;
  }

  .nav-group {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .nav-section-label {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #94a3b8;
    padding: 0.625rem 0.625rem 0.375rem;
  }

  .nav-divider {
    height: 1px;
    background: rgba(0, 0, 0, 0.04);
    margin: 0.5rem 0.625rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4375rem 0.625rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #64748b;
    text-decoration: none;
    border-radius: 0.4375rem;
    transition: all 0.12s ease;
    position: relative;

    &:hover {
      background: rgba(0, 0, 0, 0.03);
      color: #334155;
    }

    &.active {
      background: #0f172a;
      color: #fff;
      font-weight: 600;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.15), 0 1px 3px -1px rgba(0, 0, 0, 0.1);
    }
  }

  .nav-icon {
    flex-shrink: 0;
    opacity: 0.55;
    transition: opacity 0.12s;
  }

  .nav-item:hover .nav-icon { opacity: 0.8; }
  .nav-item.active .nav-icon { opacity: 1; }

  .nav-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ——— Footer ——— */
  .sidebar-footer {
    padding: 0.75rem 1rem;
    border-top: 1px solid rgba(0, 0, 0, 0.04);
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #94a3b8;
    text-decoration: none;
    transition: color 0.12s;
    &:hover { color: #334155; }
  }

  /* ——— Main ——— */
  .main {
    flex: 1;
    padding: 2rem 2.5rem;
    min-width: 0;
    overflow-y: auto;
    background: #f4f5f7;
  }

  /* ——— Responsive ——— */
  @media (max-width: 768px) {
    .shell { flex-direction: column; }
    .sidebar {
      width: 100%;
      flex-direction: row;
      align-items: center;
      padding: 0;
      border-right: none;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      overflow-y: hidden;
      overflow-x: auto;
    }
    .brand { padding: 0.5rem 0.75rem; }
    .nav { flex-direction: row; padding: 0 0.5rem; gap: 0; overflow-x: auto; }
    .nav-group { flex-direction: row; }
    .nav-divider { display: none; }
    .nav-section-label { display: none; }
    .nav-item { white-space: nowrap; padding: 0.5rem 0.5rem; border-radius: 0.375rem; }
    .nav-icon { display: none; }
    .sidebar-footer { display: none; }
    .main { padding: 1.25rem; }
  }
</style>

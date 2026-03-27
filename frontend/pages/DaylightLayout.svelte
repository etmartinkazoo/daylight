<script>
import { usePage } from "@inertiajs/svelte";
import NavIcon from "@/components/ui/NavIcon.svelte";

let { children } = $props();
const pageStore = usePage();
let url = $derived(pageStore.url?.split("?")[0] || "");
let base = $derived(pageStore.props?.base_path || "/daylight");

let nav = $derived([
  { label: "Errors", href: `${base}/errors`, match: `${base}/errors`, icon: "errors" },
  { label: "Incidents", href: `${base}/incidents`, match: `${base}/incidents`, icon: "incidents" },
  { label: "Solutions", href: `${base}/solutions`, match: `${base}/solutions`, icon: "solutions" },
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

let primaryNav = $derived(nav.slice(0, 7));
let secondaryNav = $derived(nav.slice(7, 11));
let utilNav = $derived(nav.slice(11));

function isActive(item) {
  if (item.match)
    return (
      url.startsWith(item.match) ||
      (url === base && item.match === `${base}/errors`)
    );
  return false;
}

let dark = $state(false);

$effect(() => {
  const saved = localStorage.getItem("daylight-theme");
  if (saved) {
    dark = saved === "dark";
  } else {
    dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
});

$effect(() => {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  localStorage.setItem("daylight-theme", dark ? "dark" : "light");
});

function toggleTheme() {
  dark = !dark;
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
      {#snippet navGroup(items)}
        <div class="nav-group">
          {#each items as item (item.label)}
            <a href={item.href} class="nav-item" class:active={isActive(item)}>
              <NavIcon icon={item.icon} />
              <span class="nav-label">{item.label}</span>
            </a>
          {/each}
        </div>
      {/snippet}

      {@render navGroup(primaryNav)}
      <div class="nav-divider"></div>
      <div class="nav-group">
        <span class="nav-section-label">Infrastructure</span>
        {#each secondaryNav as item (item.label)}
          <a href={item.href} class="nav-item" class:active={isActive(item)}>
            <NavIcon icon={item.icon} />
            <span class="nav-label">{item.label}</span>
          </a>
        {/each}
      </div>
      <div class="nav-divider"></div>
      {@render navGroup(utilNav)}
    </nav>

    <div class="sidebar-footer">
      <button class="theme-toggle" onclick={toggleTheme} title={dark ? "Switch to light mode" : "Switch to dark mode"}>
        {#if dark}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        {:else}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        {/if}
        <span>{dark ? "Light mode" : "Dark mode"}</span>
      </button>
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
  .shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .sidebar {
    width: 224px;
    background: var(--color-bg);
    border-right: 1px solid var(--color-border-alpha);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .brand { padding: 1.25rem 1rem 1rem; }

  .brand-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-decoration: none;
    color: var(--color-fg);
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
    color: var(--color-muted-light);
    padding: 0.625rem 0.625rem 0.375rem;
  }

  .nav-divider {
    height: 1px;
    background: var(--color-border-subtle-alpha);
    margin: 0.5rem 0.625rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4375rem 0.625rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-muted);
    text-decoration: none;
    border-radius: 0.4375rem;
    transition: all 0.12s ease;

    &:hover {
      background: var(--color-hover-overlay);
      color: var(--color-fg-tertiary);
    }

    &.active {
      background: var(--color-nav-active-bg);
      color: var(--color-nav-active-fg);
      font-weight: 600;
      box-shadow: var(--color-nav-active-shadow);
    }
  }

  .nav-item :global(.nav-icon) {
    flex-shrink: 0;
    opacity: 0.55;
    transition: opacity 0.12s;
  }

  .nav-item:hover :global(.nav-icon) { opacity: 0.8; }
  .nav-item.active :global(.nav-icon) { opacity: 1; }

  .nav-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar-footer {
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--color-border-subtle-alpha);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .theme-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.375rem 0.5rem;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: inherit;
    color: var(--color-muted);
    background: var(--color-accent);
    border: 1px solid var(--color-border);
    border-radius: 0.4375rem;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      color: var(--color-fg);
      background: var(--color-surface);
      border-color: var(--color-muted-lightest);
    }
  }

  .back-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-muted-light);
    text-decoration: none;
    transition: color 0.12s;
    &:hover { color: var(--color-fg-tertiary); }
  }

  .main {
    flex: 1;
    padding: 2rem 2.5rem;
    min-width: 0;
    overflow-y: auto;
    background: var(--color-bg-page);
  }

  @media (max-width: 768px) {
    .shell { flex-direction: column; }
    .sidebar {
      width: 100%;
      flex-direction: row;
      align-items: center;
      padding: 0;
      border-right: none;
      border-bottom: 1px solid var(--color-border-alpha);
      overflow-y: hidden;
      overflow-x: auto;
    }
    .brand { padding: 0.5rem 0.75rem; }
    .nav { flex-direction: row; padding: 0 0.5rem; gap: 0; overflow-x: auto; }
    .nav-group { flex-direction: row; }
    .nav-divider { display: none; }
    .nav-section-label { display: none; }
    .nav-item { white-space: nowrap; padding: 0.5rem 0.5rem; border-radius: 0.375rem; }
    .nav-item :global(.nav-icon) { display: none; }
    .sidebar-footer { display: none; }
    .main { padding: 1.25rem; }
  }
</style>

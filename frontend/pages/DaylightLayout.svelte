<script>
import { usePage } from "@inertiajs/svelte";

let { children } = $props();
const pageStore = usePage();
let url = $derived($pageStore.url?.split("?")[0] || "");
let base = $derived($pageStore.props?.base_path || "/daylight");

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

// Group nav into sections
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

// Theme toggle
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
      <div class="nav-group">
        {#each primaryNav as item (item.label)}
          <a href={item.href} class="nav-item" class:active={isActive(item)}>
            <svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              {#if item.icon === "errors"}
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              {:else if item.icon === "incidents"}
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              {:else if item.icon === "solutions"}
                <path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>
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
  /* ——— Theme Variables ——— */
  :global(:root), :global([data-theme="light"]) {
    /* Backgrounds */
    --color-bg-page: #f4f5f7;
    --color-bg: #fff;
    --color-surface: #f8fafc;
    --color-accent: #f1f5f9;

    /* Text */
    --color-fg: #0f172a;
    --color-fg-secondary: #1e293b;
    --color-fg-tertiary: #334155;
    --color-muted: #64748b;
    --color-muted-light: #94a3b8;
    --color-muted-lightest: #cbd5e1;

    /* Borders */
    --color-border: #e2e8f0;
    --color-border-subtle: #f1f5f9;
    --color-input-border: #d1d5db;
    --color-border-alpha: rgba(0, 0, 0, 0.06);
    --color-border-subtle-alpha: rgba(0, 0, 0, 0.04);
    --color-hover-overlay: rgba(0, 0, 0, 0.03);
    --color-white-overlay: rgba(255, 255, 255, 0.5);
    --color-overlay: rgba(0, 0, 0, 0.25);

    /* Primary */
    --color-primary: #f59e0b;
    --color-primary-hover: #e8930a;
    --color-primary-fg: #fff;
    --color-primary-subtle: #fff7ed;

    /* Danger */
    --color-danger: #ef4444;
    --color-danger-hover: #dc2626;
    --color-danger-subtle: #fef2f2;
    --color-danger-border: #fecaca;
    --color-danger-bg: #fff5f5;

    /* Success */
    --color-success: #22c55e;
    --color-success-dark: #16a34a;
    --color-success-subtle: #f0fdf4;
    --color-success-border: #bbf7d0;
    --color-success-bg: #dcfce7;

    /* Warning */
    --color-warning: #f59e0b;
    --color-warning-dark: #d97706;
    --color-warning-darker: #92400e;
    --color-warning-subtle: #fffbeb;
    --color-warning-bg: #fef3c7;
    --color-warning-border: #fde68a;

    /* Info */
    --color-info: #3b82f6;
    --color-info-dark: #2563eb;
    --color-info-darker: #1d4ed8;
    --color-info-subtle: #eff6ff;
    --color-info-bg: #dbeafe;

    /* Purple */
    --color-purple: #7c3aed;
    --color-purple-light: #8b5cf6;
    --color-purple-subtle: #ede9fe;

    /* Rose */
    --color-rose: #e11d48;

    /* Nav */
    --color-nav-active-bg: #0f172a;
    --color-nav-active-fg: #fff;
    --color-nav-active-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.15), 0 1px 3px -1px rgba(0, 0, 0, 0.1);

    /* Shadows */
    --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.04);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
    --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1), 0 8px 10px rgba(0, 0, 0, 0.04);

    /* Focus */
    --color-focus: #6366f1;
    --color-focus-ring: rgba(99, 102, 241, 0.2);
    --focus-ring: 0 0 0 3px rgba(99, 102, 241, 0.2);

    /* Radius */
    --radius-sm: 0.5rem;
    --radius-lg: 0.75rem;

    /* Animation */
    --duration-fast: 0.1s;
    --duration-normal: 0.15s;
    --ease-default: ease;

    /* Misc */
    --disabled-opacity: 0.5;
    --scrollbar-thumb: rgba(0, 0, 0, 0.12);
    --scrollbar-thumb-hover: rgba(0, 0, 0, 0.2);

    /* Status 2xx/4xx/5xx */
    --color-status-2xx: #15803d;
    --color-status-2xx-bg: #dcfce7;
    --color-status-4xx: #b45309;
    --color-status-4xx-bg: #fef3c7;
    --color-status-5xx: #dc2626;
    --color-status-5xx-bg: #fee2e2;
  }

  :global([data-theme="dark"]) {
    --color-bg-page: #09090b;
    --color-bg: #18181b;
    --color-surface: #1c1c20;
    --color-accent: #27272a;

    --color-fg: #fafafa;
    --color-fg-secondary: #e4e4e7;
    --color-fg-tertiary: #a1a1aa;
    --color-muted: #71717a;
    --color-muted-light: #52525b;
    --color-muted-lightest: #3f3f46;

    --color-border: #27272a;
    --color-border-subtle: #1e1e22;
    --color-input-border: #3f3f46;
    --color-border-alpha: rgba(255, 255, 255, 0.08);
    --color-border-subtle-alpha: rgba(255, 255, 255, 0.05);
    --color-hover-overlay: rgba(255, 255, 255, 0.04);
    --color-white-overlay: rgba(255, 255, 255, 0.08);
    --color-overlay: rgba(0, 0, 0, 0.6);

    --color-primary: #f59e0b;
    --color-primary-hover: #fbbf24;
    --color-primary-fg: #18181b;
    --color-primary-subtle: #2a2015;

    --color-danger: #f87171;
    --color-danger-hover: #fca5a5;
    --color-danger-subtle: #2a1515;
    --color-danger-border: #5c2020;
    --color-danger-bg: #2a1515;

    --color-success: #4ade80;
    --color-success-dark: #22c55e;
    --color-success-subtle: #142a18;
    --color-success-border: #1a4028;
    --color-success-bg: #142a18;

    --color-warning: #fbbf24;
    --color-warning-dark: #f59e0b;
    --color-warning-darker: #fbbf24;
    --color-warning-subtle: #2a2510;
    --color-warning-bg: #2a2510;
    --color-warning-border: #4a3a10;

    --color-info: #60a5fa;
    --color-info-dark: #3b82f6;
    --color-info-darker: #60a5fa;
    --color-info-subtle: #152040;
    --color-info-bg: #152040;

    --color-purple: #a78bfa;
    --color-purple-light: #c4b5fd;
    --color-purple-subtle: #2a1a4a;

    --color-rose: #fb7185;

    --color-nav-active-bg: #f59e0b;
    --color-nav-active-fg: #18181b;
    --color-nav-active-shadow: 0 1px 3px rgba(245, 158, 11, 0.25), 0 1px 2px rgba(0, 0, 0, 0.3);

    --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.4), 0 4px 6px rgba(0, 0, 0, 0.3);
    --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.5), 0 8px 10px rgba(0, 0, 0, 0.3);

    --color-focus: #818cf8;
    --color-focus-ring: rgba(129, 140, 248, 0.3);
    --focus-ring: 0 0 0 3px rgba(129, 140, 248, 0.3);

    --scrollbar-thumb: rgba(255, 255, 255, 0.12);
    --scrollbar-thumb-hover: rgba(255, 255, 255, 0.2);

    --color-status-2xx: #4ade80;
    --color-status-2xx-bg: #142a18;
    --color-status-4xx: #fbbf24;
    --color-status-4xx-bg: #2a2510;
    --color-status-5xx: #f87171;
    --color-status-5xx-bg: #2a1515;
  }

  /* ——— Reset & Foundation ——— */
  :global(html), :global(body) {
    margin: 0;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
    background: var(--color-bg-page) !important;
    color: var(--color-fg);
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
  :global(::-webkit-scrollbar-thumb) { background: var(--scrollbar-thumb); border-radius: 10px; }
  :global(::-webkit-scrollbar-thumb:hover) { background: var(--scrollbar-thumb-hover); }

  .shell {
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  /* ——— Sidebar ——— */
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

  .brand {
    padding: 1.25rem 1rem 1rem;
  }

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
    position: relative;

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

  /* ——— Main ——— */
  .main {
    flex: 1;
    padding: 2rem 2.5rem;
    min-width: 0;
    overflow-y: auto;
    background: var(--color-bg-page);
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
    .nav-icon { display: none; }
    .sidebar-footer { display: none; }
    .main { padding: 1.25rem; }
  }
</style>

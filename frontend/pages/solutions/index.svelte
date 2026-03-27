<script>
  import { router } from "@inertiajs/svelte";
  import DaylightLayout from "../DaylightLayout.svelte";
  import Button from "@/components/ui/Button.svelte";
  import InfiniteScroll from "@/components/ui/InfiniteScroll.svelte";
  import { timeAgo } from "@/lib/formatters.js";

  let {
    solutions = [],
    counts = {},
    status = "all",
    page = 1,
    has_more = false,
    last_scan_at,
    last_scan_count,
    last_scan_error,
    github_configured,
    base_path: base = "/daylight",
  } = $props();
  let generating = $state(false);

  function changeStatus(s) {
    router.get(`${base}/solutions`, { status: s }, { preserveState: true });
  }

  function viewSolution(solution) {
    router.get(`${base}/solutions/${solution.id}`);
  }

  function generateSolutions() {
    generating = true;
    router.post(`${base}/solutions/generate`, {}, {
      preserveState: true,
      onFinish: () => { generating = false; },
    });
  }

  const tabs = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "approved", label: "Approved" },
    { key: "pushed", label: "Pushed" },
    { key: "rejected", label: "Rejected" },
  ];

  const severityColors = {
    critical: "var(--color-danger)",
    warning: "var(--color-warning)",
    info: "var(--color-info)",
  };

  const sourceTypeBadgeColors = {
    performance: { bg: "var(--color-warning-subtle)", color: "var(--color-warning-dark)" },
    security: { bg: "var(--color-danger-subtle)", color: "var(--color-danger-hover)" },
  };

  const statusBadgeStyles = {
    draft: { bg: "var(--color-accent)", color: "var(--color-muted)" },
    approved: { bg: "var(--color-info-subtle, var(--color-accent))", color: "var(--color-info)" },
    pushed: { bg: "var(--color-success-subtle)", color: "var(--color-success-dark)" },
    rejected: { bg: "var(--color-danger-subtle)", color: "var(--color-danger-hover)" },
  };

  function getSourceBadge(type) {
    return sourceTypeBadgeColors[(type || "").toLowerCase()] || { bg: "var(--color-accent)", color: "var(--color-muted)" };
  }

  function getStatusBadge(s) {
    return statusBadgeStyles[s] || { bg: "var(--color-accent)", color: "var(--color-muted)" };
  }

  function sourceLabel(type) {
    if (!type) return "Unknown";
    const lower = type.toLowerCase();
    if (lower === "performance") return "Performance";
    if (lower === "security") return "Security";
    return type;
  }

  let allSolutions = $state(solutions);
  let currentPage = $state(page);
  let loadingMore = $state(false);

  $effect(() => {
    status;
    allSolutions = solutions;
    currentPage = page;
  });

  function loadMore() {
    if (loadingMore || !has_more) return;
    loadingMore = true;
    router.get(`${base}/solutions`, { status, page: currentPage + 1 }, {
      preserveState: true,
      preserveScroll: true,
      only: ['solutions', 'page', 'has_more'],
      onSuccess: (p) => {
        const newItems = p.props.solutions || [];
        allSolutions = [...allSolutions, ...newItems];
        currentPage = p.props.page;
        has_more = p.props.has_more;
        loadingMore = false;
      },
      onError: () => { loadingMore = false; }
    });
  }
</script>

<svelte:head><title>Solutions — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="solutions-page">
    <!-- Header -->
    <div class="dl-page-header">
      <div>
        <h1 class="dl-page-title">Solutions</h1>
        <p class="dl-page-subtitle">AI-generated fixes for performance and security issues</p>
      </div>
      <div class="header-actions">
        {#if last_scan_at}
          <span class="scan-info">
            Last scan {timeAgo(last_scan_at)}
            {#if last_scan_count != null}
              &middot; {last_scan_count} found
            {/if}
          </span>
        {/if}
        {#if last_scan_error}
          <span class="scan-error">{last_scan_error}</span>
        {/if}
        <Button variant="primary" size="sm" onclick={generateSolutions} disabled={generating}>
          {#if generating}
            <span class="btn-spinner"></span>
            Generating...
          {:else}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            Generate Solutions
          {/if}
        </Button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-row">
      <div class="tabs">
        {#each tabs as tab (tab.key)}
          <button class="tab" class:active={status === tab.key} onclick={() => changeStatus(tab.key)}>
            {tab.label}
            {#if tab.key !== "all" && counts[tab.key]}<span class="tab-count">{counts[tab.key]}</span>{/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Solution Cards -->
    {#if allSolutions.length === 0}
      <div class="dl-table-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-lightest)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
        <p style="font-weight: 600;">No solutions found</p>
        <p>No solutions to show for this filter. Try generating new solutions.</p>
      </div>
    {:else}
      <div class="solution-list">
        {#each allSolutions as solution (solution.id)}
          {@const sevColor = severityColors[solution.severity] || "var(--color-muted)"}
          {@const sourceBadge = getSourceBadge(solution.source_type)}
          {@const statusBadge = getStatusBadge(solution.status)}
          <button
            class="solution-card"
            onclick={() => viewSolution(solution)}
          >
            <div class="severity-bar" style="background: {sevColor}"></div>
            <div class="solution-content">
              <div class="solution-top">
                <div class="solution-badges">
                  <span class="source-badge" style="background: {sourceBadge.bg}; color: {sourceBadge.color}">
                    {sourceLabel(solution.source_type)}
                  </span>
                  <span class="severity-dot" style="background: {sevColor}" title={solution.severity}></span>
                  <span class="status-badge" style="background: {statusBadge.bg}; color: {statusBadge.color}">
                    {solution.status}
                  </span>
                </div>
                <span class="solution-time">{timeAgo(solution.generated_at)}</span>
              </div>
              <h3 class="solution-title">{solution.title}</h3>
              {#if solution.problem_description}
                <p class="solution-description">{solution.problem_description}</p>
              {/if}
              {#if solution.file_paths && solution.file_paths.length > 0}
                <div class="file-paths">
                  {#each solution.file_paths.slice(0, 3) as fp}
                    <code class="file-path">{fp}</code>
                  {/each}
                  {#if solution.file_paths.length > 3}
                    <span class="file-path-more">+{solution.file_paths.length - 3} more</span>
                  {/if}
                </div>
              {/if}
              <div class="solution-footer">
                <div class="solution-footer-left">
                  {#if solution.status === "pushed" && solution.pr_url}
                    <a class="pr-link" href={solution.pr_url} target="_blank" rel="noopener noreferrer" onclick={(e) => e.stopPropagation()}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7"/><line x1="6" y1="9" x2="6" y2="21"/>
                      </svg>
                      PR
                    </a>
                  {/if}
                  {#if solution.message_count > 0}
                    <span class="message-count" title="{solution.message_count} chat message{solution.message_count === 1 ? '' : 's'}">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                      </svg>
                      {solution.message_count}
                    </span>
                  {/if}
                </div>
                <span class="view-details">View Details &rarr;</span>
              </div>
            </div>
          </button>
        {/each}
        <InfiniteScroll loading={loadingMore} hasMore={has_more} onLoadMore={loadMore} />
      </div>
    {/if}
  </div>
</DaylightLayout>

<style>
  .solutions-page { display: flex; flex-direction: column; gap: 1.5rem; }

  .header-actions { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }
  .scan-info { font-size: 0.75rem; color: var(--color-muted-light); font-variant-numeric: tabular-nums; }
  .scan-error { font-size: 0.75rem; color: var(--color-danger); }

  .btn-spinner {
    width: 0.75rem; height: 0.75rem;
    border: 2px solid currentColor; border-top-color: transparent;
    border-radius: 50%; display: inline-block;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Tabs */
  .tabs-row { display: flex; align-items: center; gap: 1rem; }
  .tabs { display: flex; gap: 0.125rem; background: var(--color-accent); border-radius: 0.5rem; padding: 0.1875rem; }
  .tab {
    padding: 0.375rem 0.875rem; font-size: 0.8125rem; font-weight: 500; font-family: inherit;
    border: none; border-radius: 0.375rem; background: transparent; color: var(--color-muted);
    cursor: pointer; transition: all 0.15s ease; display: flex; align-items: center; gap: 0.375rem;
  }
  .tab:hover { color: var(--color-fg); }
  .tab.active { background: var(--color-bg); color: var(--color-fg); font-weight: 600; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1); }
  .tab-count { font-size: 0.6875rem; font-weight: 600; background: var(--color-border); color: var(--color-fg-tertiary); padding: 0.0625rem 0.375rem; border-radius: 9999px; font-variant-numeric: tabular-nums; }
  .tab.active .tab-count { background: var(--color-fg); color: var(--color-bg); }

  /* Solution Cards */
  .solution-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .solution-card {
    display: flex; align-items: stretch; background: var(--color-bg); border: 1px solid var(--color-border);
    border-radius: 0.75rem; overflow: hidden; cursor: pointer; transition: all 0.2s ease;
    text-align: left; font-family: inherit; width: 100%; padding: 0;
  }
  .solution-card:hover { box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 4px -2px var(--color-border-subtle-alpha); transform: translateY(-1px); border-color: var(--color-muted-lightest); }
  .severity-bar { width: 4px; flex-shrink: 0; }
  .solution-content { flex: 1; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; min-width: 0; }
  .solution-top { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
  .solution-badges { display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap; }
  .source-badge { font-size: 0.6875rem; font-weight: 600; padding: 0.1875rem 0.5rem; border-radius: 9999px; }
  .severity-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; flex-shrink: 0; }
  .status-badge { font-size: 0.6875rem; font-weight: 600; padding: 0.1875rem 0.5rem; border-radius: 9999px; text-transform: capitalize; }
  .solution-time { font-size: 0.75rem; color: var(--color-muted-light); flex-shrink: 0; font-variant-numeric: tabular-nums; }
  .solution-title { font-size: 0.9375rem; font-weight: 650; color: var(--color-fg); margin: 0; line-height: 1.3; }
  .solution-description { font-size: 0.8125rem; color: var(--color-muted); margin: 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

  /* File paths */
  .file-paths { display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap; }
  .file-path { font-size: 0.6875rem; font-family: var(--font-mono, monospace); background: var(--color-accent); color: var(--color-muted); padding: 0.125rem 0.375rem; border-radius: 0.25rem; border: 1px solid var(--color-border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 16rem; }
  .file-path-more { font-size: 0.6875rem; color: var(--color-muted-light); font-weight: 500; }

  /* Footer */
  .solution-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem; }
  .solution-footer-left { display: flex; align-items: center; gap: 0.75rem; }
  .pr-link { font-size: 0.75rem; font-weight: 500; color: var(--color-success-dark); display: inline-flex; align-items: center; gap: 0.25rem; text-decoration: none; }
  .pr-link:hover { text-decoration: underline; color: var(--color-success); }
  .message-count { font-size: 0.75rem; color: var(--color-muted-light); display: inline-flex; align-items: center; gap: 0.25rem; }
  .view-details { font-size: 0.8125rem; font-weight: 500; color: var(--color-info); }
  .solution-card:hover .view-details { color: var(--color-info-darker); text-decoration: underline; }

  @media (max-width: 768px) {
    .header-actions { flex-wrap: wrap; }
  }
</style>

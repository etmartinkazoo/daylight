<script>
  import { router, usePage } from "@inertiajs/svelte";
  import DaylightLayout from "../DaylightLayout.svelte";
  import { markdownToHtml } from "@/lib/markdown.js";

  let { incident = {}, related_error = null, related_deploy = null } = $props();
  const pageStore = usePage();
  let base = $derived($pageStore.props?.base_path || "/daylight");

  function updateStatus(newStatus) {
    router.patch(`${base}/incidents/${incident.id}`, { status: newStatus });
  }

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`;
  }

  function formatTime(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const severityColors = {
    critical: "var(--color-danger)",
    warning: "var(--color-warning)",
    info: "var(--color-info)",
  };

  const statusBadgeStyles = {
    open: { bg: "var(--color-danger-subtle)", color: "var(--color-danger-hover)" },
    investigating: { bg: "var(--color-warning-subtle)", color: "var(--color-warning-dark)" },
    resolved: { bg: "var(--color-success-subtle)", color: "var(--color-success-dark)" },
    false_alarm: { bg: "var(--color-accent)", color: "var(--color-muted)" },
  };

  let sevColor = $derived(severityColors[incident.severity] || "var(--color-muted)");
  let statusStyle = $derived(statusBadgeStyles[incident.status] || { bg: "var(--color-accent)", color: "var(--color-muted)" });
  let investigationHtml = $derived(markdownToHtml(incident.investigation));

  let triggerEntries = $derived.by(() => {
    if (!incident.trigger_data || typeof incident.trigger_data !== "object") return [];
    return Object.entries(incident.trigger_data);
  });
</script>

<svelte:head><title>{incident.title || "Incident"} — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="incident-show">
    <!-- Back link -->
    <a href={`${base}/incidents`} class="back-link">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      All Incidents
    </a>

    <!-- Header -->
    <div class="header">
      <h1 class="title">{incident.title}</h1>
      <div class="header-meta">
        <span class="severity-badge" style="background: {sevColor}15; color: {sevColor}; border: 1px solid {sevColor}30">
          {incident.severity}
        </span>
        {#if incident.incident_type}
          <span class="type-badge">{incident.incident_type}</span>
        {/if}
        <span class="status-badge" style="background: {statusStyle.bg}; color: {statusStyle.color}">
          {#if incident.status === "investigating"}
            <span class="status-spinner"></span>
          {/if}
          {incident.status === "false_alarm" ? "False Alarm" : incident.status}
        </span>
        <span class="header-time">
          Started {timeAgo(incident.started_at)}
          <span class="header-time-abs">{formatTime(incident.started_at)}</span>
        </span>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="actions">
      {#if incident.status === "open" || incident.status === "investigating"}
        <button class="action-btn action-btn-resolve" onclick={() => updateStatus("resolved")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Resolve
        </button>
        <button class="action-btn action-btn-dismiss" onclick={() => updateStatus("false_alarm")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Mark False Alarm
        </button>
      {:else}
        <button class="action-btn action-btn-reopen" onclick={() => updateStatus("open")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
          Reopen
        </button>
      {/if}
    </div>

    <!-- Trigger Data -->
    {#if triggerEntries.length > 0}
      <div class="card">
        <h2 class="card-title">Trigger Data</h2>
        <dl class="trigger-dl">
          {#each triggerEntries as [key, value]}
            <div class="trigger-row">
              <dt>{key.replace(/_/g, " ")}</dt>
              <dd>{typeof value === "object" ? JSON.stringify(value) : value}</dd>
            </div>
          {/each}
        </dl>
      </div>
    {/if}

    <!-- Related Deploy -->
    {#if related_deploy}
      <div class="card card-deploy">
        <h2 class="card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning-dark)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Related Deploy
        </h2>
        <dl class="info-dl">
          {#if related_deploy.version}
            <div class="info-row"><dt>Version</dt><dd>{related_deploy.version}</dd></div>
          {/if}
          {#if related_deploy.git_sha}
            <div class="info-row"><dt>Git SHA</dt><dd class="mono">{related_deploy.git_sha}</dd></div>
          {/if}
          {#if related_deploy.deployed_by}
            <div class="info-row"><dt>Deployed by</dt><dd>{related_deploy.deployed_by}</dd></div>
          {/if}
          {#if related_deploy.deployed_at}
            <div class="info-row"><dt>Deployed at</dt><dd>{formatTime(related_deploy.deployed_at)}</dd></div>
          {/if}
        </dl>
      </div>
    {/if}

    <!-- Related Error -->
    {#if related_error}
      <div class="card card-error">
        <h2 class="card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Related Error
        </h2>
        <dl class="info-dl">
          {#if related_error.error_class}
            <div class="info-row"><dt>Error Class</dt><dd class="error-text">{related_error.error_class}</dd></div>
          {/if}
          {#if related_error.message}
            <div class="info-row"><dt>Message</dt><dd class="error-msg">{related_error.message}</dd></div>
          {/if}
          {#if related_error.occurrences_count != null}
            <div class="info-row"><dt>Occurrences</dt><dd>{related_error.occurrences_count}</dd></div>
          {/if}
          {#if related_error.affected_users_count != null}
            <div class="info-row"><dt>Affected Users</dt><dd>{related_error.affected_users_count}</dd></div>
          {/if}
        </dl>
        {#if related_error.id}
          <a href={`${base}/errors/${related_error.id}`} class="card-link">View Error &rarr;</a>
        {/if}
      </div>
    {/if}

    <!-- Investigation Report -->
    <div class="card card-investigation">
      <h2 class="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Investigation Report
      </h2>

      {#if incident.investigation}
        {#if incident.investigation.includes("unavailable")}
          <div class="investigation-unavailable">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{incident.investigation}</span>
          </div>
        {:else}
          <div class="investigation-content msg-content">
            {@html investigationHtml}
          </div>
        {/if}
      {:else if incident.status === "investigating"}
        <div class="investigation-loading">
          <div class="loading-spinner"></div>
          <div class="loading-text">
            <span class="loading-title">AI is investigating this incident...</span>
            <span class="loading-sub">Analysis in progress. This page will update when complete.</span>
          </div>
        </div>
      {:else}
        <div class="investigation-empty">
          <span>No investigation report available.</span>
        </div>
      {/if}
    </div>
  </div>
</DaylightLayout>

<style>
  .incident-show { display: flex; flex-direction: column; gap: 1.25rem; max-width: 900px; }

  /* Back link */
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-muted);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .back-link:hover { color: var(--color-fg); }

  /* Header */
  .header { display: flex; flex-direction: column; gap: 0.75rem; }
  .title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-fg);
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.3;
  }
  .header-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .severity-badge {
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.1875rem 0.5rem;
    border-radius: 9999px;
  }
  .type-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.1875rem 0.5rem;
    border-radius: 9999px;
    background: var(--color-accent);
    color: var(--color-fg-tertiary);
  }
  .status-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.1875rem 0.5rem;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
  .status-spinner {
    width: 0.5rem;
    height: 0.5rem;
    border: 1.5px solid var(--color-warning-dark);
    border-top-color: transparent;
    border-radius: 50%;
    display: inline-block;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .header-time {
    font-size: 0.8125rem;
    color: var(--color-muted);
    margin-left: auto;
  }
  .header-time-abs {
    color: var(--color-muted-light);
    font-size: 0.75rem;
    margin-left: 0.25rem;
  }

  /* Action Buttons */
  .actions {
    display: flex;
    gap: 0.5rem;
  }
  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    font-size: 0.8125rem;
    font-weight: 600;
    font-family: inherit;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .action-btn:hover {
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }
  .action-btn-resolve {
    color: var(--color-success-dark);
    border-color: var(--color-success-border);
    background: var(--color-success-subtle);
  }
  .action-btn-resolve:hover { background: var(--color-success-bg); }
  .action-btn-dismiss {
    color: var(--color-muted);
    border-color: var(--color-border);
  }
  .action-btn-dismiss:hover { background: var(--color-surface); }
  .action-btn-reopen {
    color: var(--color-warning-dark);
    border-color: var(--color-warning-border);
    background: var(--color-warning-subtle);
  }
  .action-btn-reopen:hover { background: var(--color-warning-bg); }

  /* Cards */
  .card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .card-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-fg);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Deploy card */
  .card-deploy {
    border-left: 3px solid var(--color-warning);
  }

  /* Error card */
  .card-error {
    border-left: 3px solid var(--color-danger);
  }

  .card-link {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-info);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .card-link:hover { color: var(--color-info-darker); text-decoration: underline; }

  /* Trigger data */
  .trigger-dl { display: flex; flex-direction: column; margin: 0; background: var(--color-surface); border-radius: 0.5rem; padding: 0.25rem 0; }
  .trigger-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--color-accent);
    font-size: 0.8125rem;
  }
  .trigger-row:last-child { border-bottom: none; }
  .trigger-row dt {
    color: var(--color-muted);
    font-weight: 500;
    text-transform: capitalize;
  }
  .trigger-row dd {
    color: var(--color-fg);
    font-weight: 500;
    margin: 0;
    text-align: right;
    max-width: 60%;
    word-break: break-all;
  }

  /* Info DL */
  .info-dl { display: flex; flex-direction: column; margin: 0; }
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-accent);
    font-size: 0.8125rem;
  }
  .info-row:last-child { border-bottom: none; }
  .info-row dt { color: var(--color-muted); font-weight: 500; }
  .info-row dd { color: var(--color-fg); font-weight: 500; margin: 0; text-align: right; }
  .mono { font-family: "SF Mono", Monaco, Menlo, monospace; font-size: 0.75rem; }
  .error-text { color: var(--color-danger-hover); font-weight: 600; }
  .error-msg { color: var(--color-muted); max-width: 60%; text-align: right; }

  /* Investigation card */
  .card-investigation { gap: 1rem; }

  /* Investigation content - markdown styles */
  .investigation-content {
    font-size: 0.875rem;
    line-height: 1.7;
    color: var(--color-fg-tertiary);
  }
  .investigation-content :global(h1),
  .investigation-content :global(.md-h1) { font-size: 1.25rem; font-weight: 700; color: var(--color-fg); margin: 1.5rem 0 0.75rem; }
  .investigation-content :global(h2),
  .investigation-content :global(.md-h2) { font-size: 1.125rem; font-weight: 650; color: var(--color-fg); margin: 1.25rem 0 0.5rem; }
  .investigation-content :global(h3),
  .investigation-content :global(.md-h3) { font-size: 1rem; font-weight: 600; color: var(--color-fg); margin: 1rem 0 0.5rem; }
  .investigation-content :global(h4),
  .investigation-content :global(.md-h4) { font-size: 0.875rem; font-weight: 600; color: var(--color-fg-tertiary); margin: 0.75rem 0 0.375rem; }
  .investigation-content :global(p),
  .investigation-content :global(.md-p) { margin: 0.5rem 0; }
  .investigation-content :global(ul),
  .investigation-content :global(.md-ul) { padding-left: 1.25rem; margin: 0.5rem 0; }
  .investigation-content :global(ol),
  .investigation-content :global(.md-ol) { padding-left: 1.25rem; margin: 0.5rem 0; }
  .investigation-content :global(li),
  .investigation-content :global(.md-li) { margin: 0.25rem 0; }
  .investigation-content :global(code),
  .investigation-content :global(.md-code) {
    font-family: "SF Mono", Monaco, Menlo, monospace;
    font-size: 0.8125em;
    background: var(--color-accent);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    color: var(--color-rose);
  }
  .investigation-content :global(.code-block) {
    margin: 0.75rem 0;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    overflow: hidden;
  }
  .investigation-content :global(.code-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.375rem 0.75rem;
    background: var(--color-accent);
    border-bottom: 1px solid var(--color-border);
    font-size: 0.6875rem;
    color: var(--color-muted);
  }
  .investigation-content :global(.code-copy) {
    font-size: 0.625rem;
    font-weight: 600;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-muted);
    cursor: pointer;
  }
  .investigation-content :global(.md-pre) {
    margin: 0;
    padding: 0.75rem;
    background: var(--color-surface);
    font-family: "SF Mono", Monaco, Menlo, monospace;
    font-size: 0.75rem;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .investigation-content :global(blockquote),
  .investigation-content :global(.md-blockquote) {
    border-left: 3px solid var(--color-border);
    padding-left: 0.75rem;
    margin: 0.5rem 0;
    color: var(--color-muted);
    font-style: italic;
  }
  .investigation-content :global(hr),
  .investigation-content :global(.md-hr) {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 1rem 0;
  }
  .investigation-content :global(strong) { font-weight: 650; color: var(--color-fg); }
  .investigation-content :global(a),
  .investigation-content :global(.md-link) { color: var(--color-info); text-decoration: none; }
  .investigation-content :global(a:hover),
  .investigation-content :global(.md-link:hover) { text-decoration: underline; }
  .investigation-content :global(.md-table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8125rem;
    margin: 0.75rem 0;
  }
  .investigation-content :global(.md-table th) {
    background: var(--color-surface);
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    font-weight: 600;
    text-align: left;
    color: var(--color-fg-tertiary);
  }
  .investigation-content :global(.md-table td) {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
  }

  /* Investigation unavailable */
  .investigation-unavailable {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--color-surface);
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    color: var(--color-muted);
  }

  /* Investigation loading */
  .investigation-loading {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, var(--color-warning-subtle) 0%, var(--color-warning-bg) 100%);
    border: 1px solid var(--color-warning-border);
    border-radius: 0.5rem;
    animation: loading-pulse 3s ease-in-out infinite;
  }
  @keyframes loading-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.85; }
  }

  .loading-spinner {
    width: 1.5rem;
    height: 1.5rem;
    border: 2.5px solid var(--color-warning-border);
    border-top-color: var(--color-warning);
    border-radius: 50%;
    flex-shrink: 0;
    animation: spin 0.8s linear infinite;
  }
  .loading-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .loading-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-warning-darker);
  }
  .loading-sub {
    font-size: 0.75rem;
    color: var(--color-warning-darker);
  }

  /* Investigation empty */
  .investigation-empty {
    padding: 1rem;
    font-size: 0.8125rem;
    color: var(--color-muted-light);
    text-align: center;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .header-time { margin-left: 0; }
    .actions { flex-wrap: wrap; }
  }
</style>

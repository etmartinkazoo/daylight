<script>
  import { router } from "@inertiajs/svelte";
  import DaylightLayout from "../DaylightLayout.svelte";
  import { markdownToHtml } from "@/lib/markdown.js";
  import { timeAgo, formatTimeLong } from "@/lib/formatters.js";

  let { incident = {}, related_error = null, related_deploy = null, base_path: base = "/daylight" } = $props();

  function updateStatus(newStatus) {
    router.patch(`${base}/incidents/${incident.id}`, { status: newStatus });
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
    <a href={`${base}/incidents`} class="dl-back-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      All Incidents
    </a>

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
          <span class="header-time-abs">{formatTimeLong(incident.started_at)}</span>
        </span>
      </div>
    </div>

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

    {#if triggerEntries.length > 0}
      <div class="dl-card">
        <h2 class="dl-card-title">Trigger Data</h2>
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

    {#if related_deploy}
      <div class="dl-card card-deploy">
        <h2 class="dl-card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning-dark)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Related Deploy
        </h2>
        <dl class="info-dl">
          {#if related_deploy.version}
            <div class="info-row"><dt>Version</dt><dd>{related_deploy.version}</dd></div>
          {/if}
          {#if related_deploy.git_sha}
            <div class="info-row"><dt>Git SHA</dt><dd class="dl-mono">{related_deploy.git_sha}</dd></div>
          {/if}
          {#if related_deploy.deployed_by}
            <div class="info-row"><dt>Deployed by</dt><dd>{related_deploy.deployed_by}</dd></div>
          {/if}
          {#if related_deploy.deployed_at}
            <div class="info-row"><dt>Deployed at</dt><dd>{formatTimeLong(related_deploy.deployed_at)}</dd></div>
          {/if}
        </dl>
      </div>
    {/if}

    {#if related_error}
      <div class="dl-card card-error">
        <h2 class="dl-card-title">
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

    <div class="dl-card card-investigation">
      <h2 class="dl-card-title">
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
  .header-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

  /* Badges */
  .severity-badge, .type-badge, .status-badge { font-weight: 600; padding: 0.1875rem 0.5rem; border-radius: 9999px; font-size: 0.6875rem; }
  .severity-badge { font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .type-badge { background: var(--color-accent); color: var(--color-fg-tertiary); }
  .status-badge { display: inline-flex; align-items: center; gap: 0.25rem; }
  .status-spinner { width: 0.5rem; height: 0.5rem; border: 1.5px solid var(--color-warning-dark); border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .header-time { font-size: 0.8125rem; color: var(--color-muted); margin-left: auto; }
  .header-time-abs { color: var(--color-muted-light); font-size: 0.75rem; margin-left: 0.25rem; }

  /* Action Buttons */
  .actions { display: flex; gap: 0.5rem; }
  .action-btn { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 1rem; font-size: 0.8125rem; font-weight: 600; font-family: inherit; border: 1px solid var(--color-border); border-radius: 0.5rem; background: var(--color-bg); cursor: pointer; transition: all 0.15s ease; }
  .action-btn:hover { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); }
  .action-btn-resolve { color: var(--color-success-dark); border-color: var(--color-success-border); background: var(--color-success-subtle); }
  .action-btn-resolve:hover { background: var(--color-success-bg); }
  .action-btn-dismiss { color: var(--color-muted); }
  .action-btn-dismiss:hover { background: var(--color-surface); }
  .action-btn-reopen { color: var(--color-warning-dark); border-color: var(--color-warning-border); background: var(--color-warning-subtle); }
  .action-btn-reopen:hover { background: var(--color-warning-bg); }

  /* Accent cards */
  .card-deploy { border-left: 3px solid var(--color-warning); }
  .card-error { border-left: 3px solid var(--color-danger); }

  .card-link {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-info);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .card-link:hover { color: var(--color-info-darker); text-decoration: underline; }

  /* Data lists (trigger + info) */
  .trigger-dl, .info-dl { display: flex; flex-direction: column; margin: 0; }
  .trigger-dl { background: var(--color-surface); border-radius: 0.5rem; padding: 0.25rem 0; }
  .trigger-row, .info-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 0.8125rem; border-bottom: 1px solid var(--color-accent); }
  .trigger-row { padding: 0.5rem 0.75rem; }
  .info-row { padding: 0.5rem 0; }
  .trigger-row:last-child, .info-row:last-child { border-bottom: none; }
  .trigger-row dt, .info-row dt { color: var(--color-muted); font-weight: 500; }
  .trigger-row dt { text-transform: capitalize; }
  .trigger-row dd, .info-row dd { color: var(--color-fg); font-weight: 500; margin: 0; text-align: right; }
  .trigger-row dd { max-width: 60%; word-break: break-all; }
  .error-text { color: var(--color-danger-hover); font-weight: 600; }
  .error-msg { color: var(--color-muted); max-width: 60%; text-align: right; }

  /* Investigation card */
  .card-investigation { gap: 1rem; }

  .investigation-content { font-size: 0.875rem; line-height: 1.7; color: var(--color-fg-tertiary); }
  .investigation-unavailable { display: flex; align-items: center; gap: 0.5rem; padding: 1rem; background: var(--color-surface); border-radius: 0.5rem; font-size: 0.8125rem; color: var(--color-muted); }
  .investigation-loading { display: flex; align-items: center; gap: 1rem; padding: 1.5rem; background: linear-gradient(135deg, var(--color-warning-subtle) 0%, var(--color-warning-bg) 100%); border: 1px solid var(--color-warning-border); border-radius: 0.5rem; animation: loading-pulse 3s ease-in-out infinite; }
  @keyframes loading-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }
  .loading-spinner { width: 1.5rem; height: 1.5rem; border: 2.5px solid var(--color-warning-border); border-top-color: var(--color-warning); border-radius: 50%; flex-shrink: 0; animation: spin 0.8s linear infinite; }
  .loading-text { display: flex; flex-direction: column; gap: 0.25rem; }
  .loading-title { font-size: 0.875rem; font-weight: 600; color: var(--color-warning-darker); }
  .loading-sub { font-size: 0.75rem; color: var(--color-warning-darker); }
  .investigation-empty { padding: 1rem; font-size: 0.8125rem; color: var(--color-muted-light); text-align: center; }

  @media (max-width: 768px) {
    .header-time { margin-left: 0; }
    .actions { flex-wrap: wrap; }
  }
</style>

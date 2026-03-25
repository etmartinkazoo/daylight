<script>
  import DaylightLayout from "./DaylightLayout.svelte";
  import EwSheet from "./EwSheet.svelte";

  let { system = {}, database = {}, jobs = {}, errors = {} } = $props();

  let activeTab = $state("system");
  let sheetOpen = $state(false);
  let sheetTitle = $state("");
  let sheetData = $state(null);

  const tabs = [
    { key: "system", label: "System" },
    { key: "database", label: "Database" },
    { key: "errors", label: "Errors" },
    { key: "jobs", label: "Jobs" },
  ];

  function formatTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  function openFailure(f) {
    sheetTitle = f.job_class || "Job Failure";
    sheetData = f;
    sheetOpen = true;
  }
</script>

<svelte:head>
  <title>Health — Daylight</title>
</svelte:head>

<DaylightLayout>
  <div class="health-page">
    <h1 class="page-title">Health</h1>

    <div class="tab-bar">
      {#each tabs as tab (tab.key)}
        <button class="tab" class:active={activeTab === tab.key} onclick={() => activeTab = tab.key}>
          {tab.label}
        </button>
      {/each}
    </div>

    <div class="tab-content">
      {#if activeTab === "system"}
        <dl class="info-list">
          <div class="info-row"><dt>Ruby</dt><dd>{system.ruby_version}</dd></div>
          <div class="info-row"><dt>Rails</dt><dd>{system.rails_version}</dd></div>
          <div class="info-row">
            <dt>Environment</dt>
            <dd><span class="env-badge" class:production={system.environment === "production"}>{system.environment}</span></dd>
          </div>
          <div class="info-row"><dt>Uptime</dt><dd>{system.uptime}</dd></div>
          <div class="info-row"><dt>Memory</dt><dd>{system.memory_mb ? `${system.memory_mb} MB` : "—"}</dd></div>
          <div class="info-row"><dt>PID</dt><dd class="mono">{system.pid}</dd></div>
          <div class="info-row"><dt>Server Time</dt><dd>{formatTime(system.server_time)}</dd></div>
        </dl>

      {:else if activeTab === "database"}
        <dl class="info-list">
          <div class="info-row"><dt>Adapter</dt><dd>{database.adapter || "—"}</dd></div>
          <div class="info-row">
            <dt>Connected</dt>
            <dd>
              <span class="dot" class:ok={database.connected} class:err={!database.connected}></span>
              {database.connected ? "Yes" : "No"}
            </dd>
          </div>
          <div class="info-row"><dt>Tables</dt><dd>{database.tables ?? "—"}</dd></div>
          {#if database.size_mb != null}
            <div class="info-row"><dt>App DB Size</dt><dd>{database.size_mb} MB</dd></div>
          {/if}
          {#if database.errorwatch_size_mb != null}
            <div class="info-row"><dt>Daylight DB Size</dt><dd>{database.errorwatch_size_mb} MB</dd></div>
          {/if}
          {#if database.error}
            <div class="info-row"><dt>Error</dt><dd class="err-text">{database.error}</dd></div>
          {/if}
        </dl>

      {:else if activeTab === "errors"}
        <div class="stat-row">
          <div class="stat" class:stat-err={errors.open > 0}>
            <span class="stat-val">{errors.open}</span>
            <span class="stat-label">Open</span>
          </div>
          <div class="stat">
            <span class="stat-val">{errors.last_24h}</span>
            <span class="stat-label">Last 24h</span>
          </div>
          <div class="stat">
            <span class="stat-val">{errors.last_7d}</span>
            <span class="stat-label">Last 7d</span>
          </div>
          <div class="stat">
            <span class="stat-val">{errors.total}</span>
            <span class="stat-label">Total</span>
          </div>
        </div>
        {#if errors.open > 0}
          <a href="/daylight/errors" class="action-link">View open errors &rarr;</a>
        {/if}

      {:else if activeTab === "jobs"}
        {#if !jobs.available}
          <p class="empty-text">Solid Queue not detected</p>
        {:else if jobs.error}
          <p class="err-text">{jobs.error}</p>
        {:else}
          <div class="stat-row">
            <div class="stat">
              <span class="stat-val">{jobs.ready ?? 0}</span>
              <span class="stat-label">Ready</span>
            </div>
            <div class="stat">
              <span class="stat-val">{jobs.scheduled ?? 0}</span>
              <span class="stat-label">Scheduled</span>
            </div>
            <div class="stat">
              <span class="stat-val">{jobs.claimed ?? 0}</span>
              <span class="stat-label">Running</span>
            </div>
            <div class="stat" class:stat-err={jobs.failed > 0}>
              <span class="stat-val">{jobs.failed ?? 0}</span>
              <span class="stat-label">Failed</span>
            </div>
            <div class="stat">
              <span class="stat-val">{jobs.processes ?? 0}</span>
              <span class="stat-label">Processes</span>
            </div>
          </div>

          {#if jobs.recent_failures?.length > 0}
            <h3 class="sub-title">Recent Failures</h3>
            <div class="failure-list">
              {#each jobs.recent_failures as f (f.id)}
                <button class="failure-row" onclick={() => openFailure(f)}>
                  <span class="failure-job">{f.job_class || "Unknown"}</span>
                  <span class="failure-err">{f.error_class}: {f.error_message}</span>
                  <span class="failure-time">{formatTime(f.failed_at)}</span>
                </button>
              {/each}
            </div>
          {/if}
        {/if}
      {/if}
    </div>
  </div>
</DaylightLayout>

<EwSheet bind:open={sheetOpen} title={sheetTitle}>
  {#if sheetData}
    <div class="sheet-detail">
      <dl class="info-list">
        <div class="info-row"><dt>Job Class</dt><dd>{sheetData.job_class}</dd></div>
        <div class="info-row"><dt>Error Class</dt><dd class="err-text">{sheetData.error_class}</dd></div>
        <div class="info-row"><dt>Failed At</dt><dd>{formatTime(sheetData.failed_at)}</dd></div>
      </dl>
      {#if sheetData.error_message}
        <h4 class="sheet-sub">Error Message</h4>
        <pre class="sheet-pre">{sheetData.error_message}</pre>
      {/if}
    </div>
  {/if}
</EwSheet>

<style>
  .health-page { display: flex; flex-direction: column; gap: 1.25rem; }
  .page-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0; }

  /* Tabs */
  .tab-bar { display: flex; gap: 0; border-bottom: 1px solid #e5e7eb; }
  .tab {
    padding: 0.5rem 1rem;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: inherit;
    border: none;
    background: none;
    color: #6b7280;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.1s;
    &:hover { color: #1e293b; }
    &.active { color: #213258; border-bottom-color: #213258; font-weight: 600; }
  }

  .tab-content {
    padding: 1rem 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Info list */
  .info-list { display: flex; flex-direction: column; margin: 0; }
  .info-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0.5rem 0; border-bottom: 1px solid #f3f4f6;
    &:last-child { border-bottom: none; }
  }
  .info-row dt { font-size: 0.8125rem; color: #6b7280; font-weight: 500; }
  .info-row dd { font-size: 0.8125rem; color: #1e293b; font-weight: 500; margin: 0; text-align: right; }

  .mono { font-family: "SF Mono", Monaco, Menlo, monospace; font-size: 0.75rem; }
  .env-badge {
    font-size: 0.625rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
    padding: 0.0625rem 0.375rem; border-radius: 0; background: #dbeafe; color: #1d4ed8;
    &.production { background: #fee2e2; color: #dc2626; }
  }
  .dot { display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 50%; margin-right: 0.25rem; &.ok { background: #22c55e; } &.err { background: #ef4444; } }
  .err-text { color: #dc2626; font-size: 0.8125rem; }
  .empty-text { color: #9ca3af; font-size: 0.8125rem; margin: 0; }

  /* Stats */
  .stat-row { display: flex; gap: 0; border: 1px solid #e5e7eb; overflow: hidden; }
  .stat {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.0625rem;
    padding: 0.75rem 0.5rem; border-right: 1px solid #e5e7eb;
    &:last-child { border-right: none; }
  }
  .stat-err .stat-val { color: #dc2626; }
  .stat-val { font-size: 1.25rem; font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }
  .stat-label { font-size: 0.5625rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #9ca3af; }

  .action-link { font-size: 0.8125rem; font-weight: 500; color: #213258; text-decoration: none; &:hover { text-decoration: underline; } }

  /* Failures */
  .sub-title { font-size: 0.8125rem; font-weight: 600; color: #374151; margin: 0; }
  .failure-list { display: flex; flex-direction: column; border: 1px solid #e5e7eb; overflow: hidden; }
  .failure-row {
    display: flex; flex-direction: column; gap: 0.125rem;
    padding: 0.5rem 0.75rem; border: none; border-bottom: 1px solid #f3f4f6;
    background: none; font-family: inherit; text-align: left; cursor: pointer;
    &:last-child { border-bottom: none; }
    &:hover { background: #f9fafb; }
  }
  .failure-job { font-size: 0.8125rem; font-weight: 600; color: #213258; }
  .failure-err { font-size: 0.6875rem; color: #dc2626; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .failure-time { font-size: 0.625rem; color: #9ca3af; }

  /* Sheet detail */
  .sheet-detail { display: flex; flex-direction: column; gap: 1rem; }
  .sheet-sub { font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; margin: 0; }
  .sheet-pre { font-size: 0.75rem; font-family: "SF Mono", Monaco, Menlo, monospace; background: #f9fafb; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; color: #dc2626; }
</style>

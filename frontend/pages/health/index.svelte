<script>
  import DaylightLayout from "../DaylightLayout.svelte";
  import EwSheet from "../errors/EwSheet.svelte";
  import DonutChart from "@/components/charts/DonutChart.svelte";
  import Sparkline from "@/components/charts/Sparkline.svelte";
  import AreaChart from "@/components/charts/AreaChart.svelte";

  let { system = {}, database = {}, jobs = {}, errors = {}, apdex = null, error_sparkline = [], request_sparkline = [], base_path: base = "/daylight" } = $props();

  let sheetOpen = $state(false);
  let sheetTitle = $state("");
  let sheetData = $state(null);

  function formatTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  }

  function openFailure(f) {
    sheetTitle = f.job_class || "Job Failure";
    sheetData = f;
    sheetOpen = true;
  }

  let apdexColor = $derived(apdex == null ? "#64748b" : apdex >= 0.9 ? "#22c55e" : apdex >= 0.7 ? "#f59e0b" : "#ef4444");

  let errorChartSegments = $derived([
    { value: errors.open ?? 0, color: "#ef4444", label: "Open" },
    { value: Math.max((errors.total ?? 0) - (errors.open ?? 0), 0), color: "#22c55e", label: "Resolved" },
  ]);
</script>

<svelte:head>
  <title>Health Dashboard — Daylight</title>
</svelte:head>

<DaylightLayout>
  <div class="health-dashboard">
    <!-- Page Header -->
    <div class="page-header">
      <h1 class="page-title">Health Dashboard</h1>
      <p class="page-subtitle">System monitoring and performance overview</p>
    </div>

    <!-- System Info Row -->
    <div class="section">
      <h2 class="section-title">System Info</h2>
      <div class="card-grid">
        <div class="stat-card">
          <span class="stat-card-label">Environment</span>
          <div class="stat-card-value">
            <span class="env-badge" class:production={system.environment === "production"}>
              {system.environment || "—"}
            </span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Ruby Version</span>
          <span class="stat-card-value stat-card-value-sm">{system.ruby_version || "—"}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Rails Version</span>
          <span class="stat-card-value stat-card-value-sm">{system.rails_version || "—"}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Uptime</span>
          <span class="stat-card-value stat-card-value-sm">{system.uptime || "—"}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Memory Usage</span>
          <span class="stat-card-value">{system.memory_mb ? `${system.memory_mb}` : "—"}</span>
          {#if system.memory_mb}
            <span class="stat-card-unit">MB</span>
          {/if}
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Process ID</span>
          <span class="stat-card-value mono">{system.pid || "—"}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Server Time</span>
          <span class="stat-card-value stat-card-value-sm">{formatTime(system.server_time)}</span>
        </div>
      </div>
    </div>

    <!-- Database Status Row -->
    <div class="section">
      <h2 class="section-title">Database Status</h2>
      <div class="card-grid">
        <div class="stat-card">
          <span class="stat-card-label">Connection</span>
          <div class="stat-card-value">
            <span class="status-indicator">
              <span class="status-dot" class:connected={database.connected} class:disconnected={!database.connected}></span>
              {database.connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Adapter</span>
          <span class="stat-card-value stat-card-value-sm">{database.adapter || "—"}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-label">Tables</span>
          <span class="stat-card-value">{database.tables ?? "—"}</span>
        </div>
        {#if database.size_mb != null}
          <div class="stat-card">
            <span class="stat-card-label">App DB Size</span>
            <span class="stat-card-value">{database.size_mb}</span>
            <span class="stat-card-unit">MB</span>
          </div>
        {/if}
        {#if database.errorwatch_size_mb != null}
          <div class="stat-card">
            <span class="stat-card-label">Daylight DB Size</span>
            <span class="stat-card-value">{database.errorwatch_size_mb}</span>
            <span class="stat-card-unit">MB</span>
          </div>
        {/if}
        {#if database.error}
          <div class="stat-card stat-card-error">
            <span class="stat-card-label">Error</span>
            <span class="stat-card-value stat-card-value-sm err-text">{database.error}</span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Performance Overview Row -->
    <div class="section">
      <h2 class="section-title">Performance Overview</h2>

      <!-- Apdex -->
      {#if apdex != null}
        <div class="subsection">
          <h3 class="subsection-title">Application Performance</h3>
          <div class="apdex-card" style="border-color: {apdexColor}20">
            <span class="apdex-label">Apdex Score</span>
            <span class="apdex-value" style="color: {apdexColor}">{apdex.toFixed(2)}</span>
            <span class="apdex-desc">
              {#if apdex >= 0.9}Excellent{:else if apdex >= 0.7}Fair{:else}Poor{/if}
            </span>
          </div>
        </div>
      {/if}

      <!-- Errors -->
      <div class="subsection">
        <h3 class="subsection-title">Errors</h3>
        <div class="card-grid-with-chart">
          <div class="chart-card">
            <span class="stat-card-label">Error Distribution</span>
            <div class="chart-wrapper">
              <DonutChart
                segments={errorChartSegments}
                size={140}
                strokeWidth={16}
                centerValue={String(errors.total ?? 0)}
                centerLabel="total"
              />
            </div>
          </div>
          <div class="stat-cards-group">
            <div class="stat-card" class:stat-card-alert={errors.open > 0}>
              <span class="stat-card-label">Open Errors</span>
              <span class="stat-card-value" class:err-value={errors.open > 0}>{errors.open ?? 0}</span>
              <span class="stat-card-description">Currently unresolved</span>
              {#if error_sparkline.length >= 2}
                <div class="sparkline-container">
                  <AreaChart data={error_sparkline} width={120} height={32} color="#ef4444" />
                </div>
              {/if}
            </div>
            <div class="stat-card">
              <span class="stat-card-label">Last 24 Hours</span>
              <span class="stat-card-value">{errors.last_24h ?? 0}</span>
              <span class="stat-card-description">Errors in past day</span>
            </div>
            <div class="stat-card">
              <span class="stat-card-label">Last 7 Days</span>
              <span class="stat-card-value">{errors.last_7d ?? 0}</span>
              <span class="stat-card-description">Errors in past week</span>
            </div>
            <div class="stat-card">
              <span class="stat-card-label">Total Errors</span>
              <span class="stat-card-value">{errors.total ?? 0}</span>
              <span class="stat-card-description">All time</span>
            </div>
          </div>
        </div>
        {#if errors.open > 0}
          <a href={`${base}/errors`} class="action-link">View open errors &rarr;</a>
        {/if}
      </div>

      <!-- Jobs -->
      <div class="subsection">
        <h3 class="subsection-title">Background Jobs</h3>
        {#if !jobs.available}
          <div class="stat-card">
            <span class="stat-card-label">Status</span>
            <span class="stat-card-value stat-card-value-sm muted-text">Solid Queue not detected</span>
          </div>
        {:else if jobs.error}
          <div class="stat-card stat-card-error">
            <span class="stat-card-label">Error</span>
            <span class="stat-card-value stat-card-value-sm err-text">{jobs.error}</span>
          </div>
        {:else}
          <div class="card-grid">
            <div class="stat-card">
              <span class="stat-card-label">Ready</span>
              <span class="stat-card-value">{jobs.ready ?? 0}</span>
              <span class="stat-card-description">Queued for processing</span>
              {#if request_sparkline.length >= 2}
                <div class="sparkline-container">
                  <AreaChart data={request_sparkline} width={120} height={32} color="#3b82f6" />
                </div>
              {/if}
            </div>
            <div class="stat-card">
              <span class="stat-card-label">Scheduled</span>
              <span class="stat-card-value">{jobs.scheduled ?? 0}</span>
              <span class="stat-card-description">Waiting to run</span>
            </div>
            <div class="stat-card">
              <span class="stat-card-label">Running</span>
              <span class="stat-card-value">{jobs.claimed ?? 0}</span>
              <span class="stat-card-description">Currently executing</span>
            </div>
            <div class="stat-card" class:stat-card-alert={jobs.failed > 0}>
              <span class="stat-card-label">Failed</span>
              <span class="stat-card-value" class:err-value={jobs.failed > 0}>{jobs.failed ?? 0}</span>
              <span class="stat-card-description">Requires attention</span>
            </div>
            <div class="stat-card">
              <span class="stat-card-label">Processes</span>
              <span class="stat-card-value">{jobs.processes ?? 0}</span>
              <span class="stat-card-description">Active workers</span>
            </div>
          </div>

          {#if jobs.recent_failures?.length > 0}
            <div class="failures-section">
              <h4 class="failures-title">Recent Failures</h4>
              <div class="failures-list">
                {#each jobs.recent_failures as f (f.id)}
                  <button class="failure-row" onclick={() => openFailure(f)}>
                    <div class="failure-main">
                      <span class="failure-job">{f.job_class || "Unknown"}</span>
                      <span class="failure-time">{formatTime(f.failed_at)}</span>
                    </div>
                    <span class="failure-err">{f.error_class}: {f.error_message}</span>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        {/if}
      </div>
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
  /* Page Layout */
  .health-dashboard {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-fg);
    margin: 0;
    letter-spacing: -0.02em;
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: var(--color-muted);
    margin: 0;
  }

  /* Sections */
  .section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .section-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-fg);
    margin: 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  .subsection {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .subsection-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-fg-tertiary);
    margin: 0;
  }

  /* Card Grid */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  .card-grid-with-chart {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1rem;
    align-items: start;
  }

  @media (max-width: 640px) {
    .card-grid-with-chart {
      grid-template-columns: 1fr;
    }
  }

  .stat-cards-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }

  /* Stat Card */
  .stat-card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: box-shadow 0.15s ease, border-color 0.15s ease;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
  }

  .stat-card:hover {
    box-shadow: 0 1px 3px 0 var(--color-border-alpha), 0 1px 2px -1px var(--color-border-alpha);
  }

  .stat-card-alert {
    border-color: var(--color-danger-border);
    background: var(--color-danger-bg);
  }

  .stat-card-error {
    border-color: var(--color-danger-border);
    background: var(--color-danger-subtle);
  }

  .stat-card-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-muted);
  }

  .stat-card-value {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-fg);
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }

  .stat-card-value-sm {
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0;
  }

  .stat-card-unit {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-muted-light);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-top: -0.25rem;
  }

  .stat-card-description {
    font-size: 0.75rem;
    color: var(--color-muted-light);
    margin-top: -0.125rem;
  }

  /* Chart Card */
  .chart-card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
  }

  .chart-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* Status Indicator */
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-fg);
  }

  .status-dot {
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-dot.connected {
    background: var(--color-success);
    box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
  }

  .status-dot.disconnected {
    background: var(--color-danger);
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
  }

  /* Environment Badge */
  .env-badge {
    display: inline-block;
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    background: var(--color-info-bg);
    color: var(--color-info-darker);
  }

  .env-badge.production {
    background: var(--color-status-5xx-bg);
    color: var(--color-danger-hover);
  }

  .mono {
    font-family: "SF Mono", Monaco, Menlo, monospace;
    font-size: 1.25rem;
  }

  .err-text {
    color: var(--color-danger-hover);
  }

  .err-value {
    color: var(--color-danger-hover);
  }

  .muted-text {
    color: var(--color-muted-light);
  }

  /* Action Link */
  .action-link {
    display: inline-flex;
    align-items: center;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-info);
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .action-link:hover {
    color: var(--color-info-darker);
    text-decoration: underline;
  }

  /* Failures Section */
  .failures-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .failures-title {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-fg-tertiary);
    margin: 0;
  }

  .failures-list {
    display: flex;
    flex-direction: column;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .failure-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem 1rem;
    border: none;
    border-bottom: 1px solid var(--color-accent);
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s ease;
  }

  .failure-row:last-child {
    border-bottom: none;
  }

  .failure-row:hover {
    background: var(--color-surface);
  }

  .failure-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .failure-job {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-fg);
  }

  .failure-time {
    font-size: 0.6875rem;
    color: var(--color-muted-light);
    flex-shrink: 0;
  }

  .failure-err {
    font-size: 0.75rem;
    color: var(--color-danger-hover);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Sheet Detail (kept from original) */
  .info-list {
    display: flex;
    flex-direction: column;
    margin: 0;
  }

  .info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-accent);
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-row dt {
    font-size: 0.8125rem;
    color: var(--color-muted);
    font-weight: 500;
  }

  .info-row dd {
    font-size: 0.8125rem;
    color: var(--color-fg);
    font-weight: 500;
    margin: 0;
    text-align: right;
  }

  .sheet-detail {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .sheet-sub {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin: 0;
  }

  .sheet-pre {
    font-size: 0.75rem;
    font-family: "SF Mono", Monaco, Menlo, monospace;
    background: var(--color-surface);
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    color: var(--color-danger-hover);
  }

  /* Apdex card */
  .apdex-card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    max-width: 200px;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
  }
  .apdex-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-muted);
  }
  .apdex-value {
    font-size: 2.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .apdex-desc {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Sparkline container */
  .sparkline-container {
    margin-top: 0.25rem;
  }
</style>

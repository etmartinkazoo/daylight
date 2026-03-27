<script>
  import { useForm, router } from "@inertiajs/svelte";
  import DaylightLayout from "../DaylightLayout.svelte";
  import Button from "@/components/ui/Button.svelte";
  import { getNotificationSound, setNotificationSound, previewSound, soundOptions } from "@/lib/notification-sounds.js";
  import { timeAgo } from "@/lib/formatters.js";
  import PerformanceIssues from "./PerformanceIssues.svelte";
  import SecurityIssues from "./SecurityIssues.svelte";

  let { settings = {}, performance_issues = [], security_issues = [], base_path: base = "/daylight" } = $props();
  let selectedSound = $state(getNotificationSound());

  let form = useForm({
    "settings[github_repo_url]": settings.github_repo_url || "",
    "settings[github_default_branch]": settings.github_default_branch || "main",
    "settings[notification_emails]": settings.notification_emails || "",
    "settings[slack_webhook_url]": settings.slack_webhook_url || "",
    "settings[slow_request_threshold_ms]": settings.slow_request_threshold_ms || "500",
    "settings[slow_query_threshold_ms]": settings.slow_query_threshold_ms || "50",
    "settings[retention_days]": settings.retention_days || "30",
    "settings[ai_context_notes]": settings.ai_context_notes || "",
    "settings[gemini_api_key]": settings.gemini_api_key || "",
    "settings[anthropic_api_key]": settings.anthropic_api_key || "",
    "settings[default_ai_model]": settings.default_ai_model || "gemini-2.5-flash",
    "settings[github_api_token]": settings.github_api_token || "",
    "settings[sample_rate]": settings.sample_rate || "1.0",
    "settings[solutions_scan_enabled]": settings.solutions_scan_enabled || "false",
    "settings[performance_scan_enabled]": settings.performance_scan_enabled || "false",
    "settings[performance_scan_interval]": settings.performance_scan_interval || "daily",
    "settings[security_scan_enabled]": settings.security_scan_enabled || "false",
    "settings[security_scan_interval]": settings.security_scan_interval || "daily",
    "settings[security_scan_min_confidence]": settings.security_scan_min_confidence || "1",
  });

  function handleSubmit(e) {
    e.preventDefault();
    $form.patch(`${base}/settings`, { preserveScroll: true });
  }

  let cleanupRunning = $state(false);
  let cleanupDone = $state(false);
  let testNotifRunning = $state(false);
  let testNotifDone = $state(false);
  let scanRunning = $state(false);
  let scanTriggered = $state(false);
  let secScanRunning = $state(false);
  let secScanTriggered = $state(false);

  function runCleanup() {
    cleanupRunning = true;
    cleanupDone = false;
    router.post(`${base}/settings/cleanup`, {}, {
      preserveScroll: true,
      onSuccess: () => { cleanupRunning = false; cleanupDone = true; },
      onError: () => { cleanupRunning = false; },
    });
  }

  function sendTestNotification() {
    testNotifRunning = true;
    testNotifDone = false;
    router.post(`${base}/settings/test_notification`, {}, {
      preserveScroll: true,
      onSuccess: () => { testNotifRunning = false; testNotifDone = true; },
      onError: () => { testNotifRunning = false; },
    });
  }

  function runPerformanceScan() {
    scanRunning = true;
    scanTriggered = false;
    router.post(`${base}/settings/run_performance_scan`, {}, {
      preserveScroll: true,
      onSuccess: () => { scanRunning = false; scanTriggered = true; },
      onError: () => { scanRunning = false; },
    });
  }

  function runSecurityScan() {
    secScanRunning = true;
    secScanTriggered = false;
    router.post(`${base}/settings/run_security_scan`, {}, {
      preserveScroll: true,
      onSuccess: () => { secScanRunning = false; secScanTriggered = true; },
      onError: () => { secScanRunning = false; },
    });
  }

  let bulletDuration = $state("30");
  let bulletStarting = $state(false);

  function startBulletDiagnostic() {
    bulletStarting = true;
    router.post(`${base}/settings/toggle_bullet_diagnostic`, { duration: bulletDuration }, {
      preserveScroll: true,
      onFinish: () => { bulletStarting = false; },
    });
  }

  function stopBulletDiagnostic() {
    router.post(`${base}/settings/stop_bullet_diagnostic`, {}, { preserveScroll: true });
  }

  let bulletTimeRemaining = $derived.by(() => {
    if (!settings.bullet_diagnostic_active || !settings.bullet_diagnostic_expires_at) return null;
    const expires = new Date(settings.bullet_diagnostic_expires_at);
    const mins = Math.max(0, Math.round((expires - new Date()) / 60000));
    return mins;
  });
</script>

<svelte:head><title>Settings — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="dl-page">
    <div class="dl-page-header">
      <h1 class="dl-page-title">Settings</h1>
      <p class="dl-page-subtitle">Configure Daylight monitoring and notifications</p>
    </div>

    <form class="form" onsubmit={handleSubmit}>

      <!-- Source Code -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Source Code</h2>
          <p class="section-desc">Connect a GitHub repo so AI can reference your code when diagnosing errors.</p>
        </div>
        <div class="section-body">
          <div class="form-field">
            <label class="form-label" for="github_repo_url">GitHub Repo URL</label>
            <input id="github_repo_url" type="url" class="form-input" placeholder="https://github.com/org/repo" bind:value={$form["settings[github_repo_url]"]} />
            <p class="form-hint">Full URL to your GitHub repository.</p>
          </div>

          <div class="form-field">
            <label class="form-label" for="github_default_branch">Default Branch</label>
            <input id="github_default_branch" type="text" class="form-input form-input-sm" placeholder="main" bind:value={$form["settings[github_default_branch]"]} />
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Notifications</h2>
          <p class="section-desc">Get notified when new errors occur or existing ones recur.</p>
        </div>
        <div class="section-body">
          <div class="form-field">
            <label class="form-label" for="notification_emails">Email Recipients</label>
            <input id="notification_emails" type="text" class="form-input" placeholder="dev@example.com, ops@example.com" bind:value={$form["settings[notification_emails]"]} />
            <p class="form-hint">Comma-separated email addresses to notify on new/recurring errors.</p>
          </div>

          <div class="form-field">
            <label class="form-label" for="slack_webhook_url">Slack Webhook URL</label>
            <input id="slack_webhook_url" type="url" class="form-input" placeholder="https://hooks.slack.com/services/..." bind:value={$form["settings[slack_webhook_url]"]} />
            <p class="form-hint">Incoming webhook URL for Slack notifications.</p>
          </div>

          <div class="form-field">
            <label class="form-label">Chat Notification Sound</label>
            <div class="sound-options">
              {#each soundOptions as opt (opt.value)}
                <button
                  type="button"
                  class="sound-option"
                  class:active={selectedSound === opt.value}
                  onclick={() => { selectedSound = opt.value; setNotificationSound(opt.value); if (opt.value !== "none") previewSound(opt.value); }}
                >
                  {opt.label}
                </button>
              {/each}
            </div>
            <p class="form-hint">Sound played when AI chat responses complete.</p>
          </div>

          <div class="form-field">
            <div class="cleanup-row">
              <Button variant="outline" type="button" disabled={testNotifRunning} onclick={sendTestNotification}>
                {testNotifRunning ? "Sending..." : "Send Test Notification"}
              </Button>
              {#if testNotifDone}
                <span class="saved-badge">Test notification sent</span>
              {/if}
            </div>
            <p class="form-hint">Send a test notification to verify your email and Slack settings.</p>
          </div>
        </div>
      </div>

      <!-- Thresholds -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Thresholds</h2>
          <p class="section-desc">Control what gets tracked.</p>
        </div>
        <div class="section-body">
          <div class="field-row">
            <div class="form-field">
              <label class="form-label" for="slow_request_threshold_ms">Slow Request Threshold</label>
              <div class="input-group">
                <input id="slow_request_threshold_ms" type="number" class="form-input input-group-input" bind:value={$form["settings[slow_request_threshold_ms]"]} />
                <span class="input-suffix">ms</span>
              </div>
              <p class="form-hint">Requests slower than this appear on the Requests page.</p>
            </div>

            <div class="form-field">
              <label class="form-label" for="slow_query_threshold_ms">Slow Query Threshold</label>
              <div class="input-group">
                <input id="slow_query_threshold_ms" type="number" class="form-input input-group-input" bind:value={$form["settings[slow_query_threshold_ms]"]} />
                <span class="input-suffix">ms</span>
              </div>
              <p class="form-hint">SQL queries slower than this are recorded.</p>
            </div>
          </div>

          <div class="form-field">
            <label class="form-label" for="retention_days">Data Retention</label>
            <div class="input-group">
              <input id="retention_days" type="number" class="form-input input-group-input" bind:value={$form["settings[retention_days]"]} />
              <span class="input-suffix">days</span>
            </div>
            <p class="form-hint">Occurrences, requests, queries, and job records older than this are purged.</p>
          </div>

          <div class="form-field">
            <div class="cleanup-row">
              <Button variant="outline" type="button" disabled={cleanupRunning} onclick={runCleanup}>
                {cleanupRunning ? "Running..." : "Run Cleanup Now"}
              </Button>
              {#if cleanupDone}
                <span class="saved-badge">Cleanup complete</span>
              {/if}
            </div>
            <p class="form-hint">Immediately purge data older than the retention period.</p>
          </div>
        </div>
      </div>

      <!-- Sampling -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Sampling</h2>
          <p class="section-desc">Control how much data Daylight captures. Exceptions are always captured at 100%.</p>
        </div>
        <div class="section-body">
          <div class="form-field">
            <label class="form-label" for="sample_rate">Global Sample Rate</label>
            <div class="input-group">
              <input id="sample_rate" type="number" step="0.1" min="0" max="1" class="form-input input-group-input" bind:value={$form["settings[sample_rate]"]} />
              <span class="input-suffix">0-1.0</span>
            </div>
            <p class="form-hint">1.0 = capture everything, 0.5 = capture 50% of requests. Exceptions are always captured regardless of this setting.</p>
          </div>
        </div>
      </div>

      <!-- AI -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">AI</h2>
          <p class="section-desc">Configure the AI assistant for the sheet AI tab.</p>
        </div>
        <div class="section-body">
          <div class="form-field">
            <div class="form-label-row">
              <label class="form-label" for="gemini_api_key">Gemini API Key</label>
              {#if settings.gemini_api_key}
                <span class="key-saved-badge">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3.5 8.5l3 3 6-6"/></svg>
                  Saved{#if settings.gemini_api_key_saved_at}&nbsp;&middot;&nbsp;{timeAgo(settings.gemini_api_key_saved_at)}{/if}
                </span>
              {/if}
            </div>
            <input id="gemini_api_key" type="password" class="form-input" placeholder={settings.gemini_api_key ? "Key saved — leave blank to keep" : "Enter API key"} bind:value={$form["settings[gemini_api_key]"]} autocomplete="off" />
            <p class="form-hint">Get a key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>. Enables Gemini Flash and Pro models.</p>
          </div>

          <div class="form-field">
            <div class="form-label-row">
              <label class="form-label" for="anthropic_api_key">Anthropic API Key</label>
              {#if settings.anthropic_api_key}
                <span class="key-saved-badge">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3.5 8.5l3 3 6-6"/></svg>
                  Saved{#if settings.anthropic_api_key_saved_at}&nbsp;&middot;&nbsp;{timeAgo(settings.anthropic_api_key_saved_at)}{/if}
                </span>
              {/if}
            </div>
            <input id="anthropic_api_key" type="password" class="form-input" placeholder={settings.anthropic_api_key ? "Key saved — leave blank to keep" : "sk-ant-..."} bind:value={$form["settings[anthropic_api_key]"]} autocomplete="off" />
            <p class="form-hint">Get a key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">Anthropic Console</a>. Enables Claude Haiku, Sonnet, and Opus models.</p>
          </div>

          <div class="form-field">
            <label class="form-label" for="default_ai_model">Default Model</label>
            <select id="default_ai_model" class="form-input" style="max-width: 280px;" bind:value={$form["settings[default_ai_model]"]}>
              <optgroup label="Gemini">
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </optgroup>
              <optgroup label="Claude">
                <option value="claude-haiku-4-5-20251001">Claude Haiku</option>
                <option value="claude-sonnet-4-6">Claude Sonnet</option>
                <option value="claude-opus-4-6">Claude Opus</option>
              </optgroup>
            </select>
            <p class="form-hint">Default model for all AI features: scanners, solutions, and chat. Can be overridden per chat.</p>
          </div>

          <div class="form-field">
            <label class="form-label" for="ai_context_notes">Context Notes</label>
            <textarea id="ai_context_notes" class="form-textarea" rows="5" placeholder="e.g. This app uses multi-tenant SQLite via activerecord-tenanted. The main models are Partner, Project, Todo, Service..." bind:value={$form["settings[ai_context_notes]"]}></textarea>
            <p class="form-hint">Describe your app's architecture, key patterns, or common pitfalls. This is prepended to every AI conversation in errorwatch.</p>
          </div>

          <div class="form-field">
            <div class="form-label-row">
              <label class="form-label" for="github_api_token">GitHub API Token</label>
              {#if settings.github_api_token}
                <span class="key-saved-badge">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3.5 8.5l3 3 6-6"/></svg>
                  Saved{#if settings.github_api_token_saved_at}&nbsp;&middot;&nbsp;{timeAgo(settings.github_api_token_saved_at)}{/if}
                </span>
              {/if}
            </div>
            <input id="github_api_token" type="password" class="form-input" placeholder={settings.github_api_token ? "Token saved — leave blank to keep" : "ghp_..."} bind:value={$form["settings[github_api_token]"]} autocomplete="off" />
            <p class="form-hint">Personal access token with <code>repo</code> scope. Required for Solutions to push PRs to GitHub.</p>
          </div>

          <div class="form-field">
            <label class="form-label" for="solutions_scan_enabled">Auto-Generate Solutions</label>
            <select id="solutions_scan_enabled" class="form-input form-input-sm" bind:value={$form["settings[solutions_scan_enabled]"]}>
              <option value="true">Enabled (daily)</option>
              <option value="false">Disabled</option>
            </select>
            <p class="form-hint">Automatically generate AI fix proposals for open performance and security issues once per day.</p>
          </div>
        </div>
      </div>

      <!-- Performance Scanning -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Performance Scanning</h2>
          <p class="section-desc">Automatically detect N+1 queries, slow query patterns, and counter cache opportunities.</p>
        </div>
        <div class="section-body">
          <div class="field-row">
            <div class="form-field">
              <label class="form-label" for="performance_scan_enabled">Auto Scan</label>
              <select id="performance_scan_enabled" class="form-input form-input-sm" bind:value={$form["settings[performance_scan_enabled]"]}>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
              <p class="form-hint">Automatically scan for performance issues on a schedule.</p>
            </div>

            <div class="form-field">
              <label class="form-label" for="performance_scan_interval">Scan Interval</label>
              <select id="performance_scan_interval" class="form-input form-input-sm" bind:value={$form["settings[performance_scan_interval]"]}>
                <option value="hourly">Every hour</option>
                <option value="6h">Every 6 hours</option>
                <option value="12h">Every 12 hours</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
              <p class="form-hint">How often to run the performance scan.</p>
            </div>
          </div>

          <div class="form-field">
            <div class="cleanup-row">
              <Button variant="outline" type="button" disabled={scanRunning} onclick={runPerformanceScan}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                {scanRunning ? "Starting..." : "Scan Now"}
              </Button>
              {#if scanTriggered}
                <span class="saved-badge">Scan queued</span>
              {/if}
              {#if settings.last_performance_scan_at}
                <span class="scan-meta">
                  Last scan: {timeAgo(settings.last_performance_scan_at)}
                  {#if settings.last_performance_scan_count}
                    &middot; {settings.last_performance_scan_count} issue{settings.last_performance_scan_count === "1" ? "" : "s"} found
                  {/if}
                </span>
              {/if}
            </div>
            <p class="form-hint">Run a performance scan immediately. Analyzes the last 24h of query data. AI solutions require a Gemini API key.</p>
          </div>

          <!-- Bullet Diagnostic Mode -->
          <div class="form-field">
            <label class="form-label">Live N+1 Detection (Bullet)</label>
            {#if settings.bullet_diagnostic_active}
              <div class="diagnostic-active">
                <span class="diagnostic-pulse"></span>
                <span class="diagnostic-label">Live detection active — {bulletTimeRemaining}min remaining, sampling 5% of requests</span>
                <Button variant="outline" size="sm" type="button" onclick={stopBulletDiagnostic}>Stop</Button>
              </div>
            {:else}
              <div class="diagnostic-start">
                <select class="form-input form-input-sm" bind:value={bulletDuration} style="max-width: 130px;">
                  <option value="5">5 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                </select>
                <Button variant="outline" type="button" disabled={bulletStarting} onclick={startBulletDiagnostic}>
                  {bulletStarting ? "Starting..." : "Start Diagnostic"}
                </Button>
              </div>
            {/if}
            <p class="form-hint">Enable Bullet live detection in production for a limited window. Instruments 5% of requests to detect N+1 queries, unused eager loads, and counter cache opportunities with exact model/association details. Always active in development.</p>
          </div>
        </div>
      </div>

      <!-- Security Scanning -->
      <div class="section-card">
        <div class="section-header">
          <h2 class="section-title">Security Scanning</h2>
          <p class="section-desc">Run Brakeman static analysis to detect SQL injection, XSS, CSRF, and other security vulnerabilities.</p>
        </div>
        <div class="section-body">
          <div class="field-row">
            <div class="form-field">
              <label class="form-label" for="security_scan_enabled">Auto Scan</label>
              <select id="security_scan_enabled" class="form-input form-input-sm" bind:value={$form["settings[security_scan_enabled]"]}>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
              <p class="form-hint">Automatically run Brakeman security scans on a schedule.</p>
            </div>

            <div class="form-field">
              <label class="form-label" for="security_scan_interval">Scan Interval</label>
              <select id="security_scan_interval" class="form-input form-input-sm" bind:value={$form["settings[security_scan_interval]"]}>
                <option value="6h">Every 6 hours</option>
                <option value="12h">Every 12 hours</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>

            <div class="form-field">
              <label class="form-label" for="security_scan_min_confidence">Min Confidence</label>
              <select id="security_scan_min_confidence" class="form-input form-input-sm" bind:value={$form["settings[security_scan_min_confidence]"]}>
                <option value="0">High only</option>
                <option value="1">High + Medium</option>
                <option value="2">All (incl. Weak)</option>
              </select>
              <p class="form-hint">Filter out low-confidence findings.</p>
            </div>
          </div>

          <div class="form-field">
            <div class="cleanup-row">
              <Button variant="outline" type="button" disabled={secScanRunning} onclick={runSecurityScan}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                {secScanRunning ? "Starting..." : "Scan Now"}
              </Button>
              {#if secScanTriggered}
                <span class="saved-badge">Scan queued</span>
              {/if}
              {#if settings.last_security_scan_at}
                <span class="scan-meta">
                  Last scan: {timeAgo(settings.last_security_scan_at)}
                  {#if settings.last_security_scan_total_warnings}
                    &middot; {settings.last_security_scan_total_warnings} warning{settings.last_security_scan_total_warnings === "1" ? "" : "s"}
                  {/if}
                  {#if settings.last_security_scan_count && settings.last_security_scan_count !== "0"}
                    &middot; {settings.last_security_scan_count} new
                  {/if}
                </span>
              {/if}
            </div>
            {#if settings.last_security_scan_error}
              <p class="form-hint" style="color: var(--color-danger)">{settings.last_security_scan_error}</p>
            {:else}
              <p class="form-hint">Run a Brakeman scan immediately. AI fix suggestions require a Gemini API key.</p>
            {/if}
          </div>
        </div>
      </div>

      <div class="form-actions">
        <Button type="submit" disabled={$form.processing}>
          {$form.processing ? "Saving..." : "Save Settings"}
        </Button>
        {#if $form.recentlySuccessful}
          <span class="saved-badge">Saved</span>
        {/if}
      </div>
    </form>

    <PerformanceIssues issues={performance_issues} {base} />
    <SecurityIssues issues={security_issues} {base} />
  </div>
</DaylightLayout>

<style>
  .dl-page {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .dl-page-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .dl-page-title {
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--color-fg);
    margin: 0;
    letter-spacing: -0.01em;
  }

  .dl-page-subtitle {
    font-size: 0.875rem;
    color: var(--color-muted);
    margin: 0;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Section cards */
  .section-card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .section-header {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--color-accent);
  }

  .section-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-fg);
    margin: 0;
  }

  .section-desc {
    font-size: 0.8125rem;
    color: var(--color-muted);
    margin: 0.25rem 0 0;
  }

  .section-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* Form fields */
  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .field-row {
    display: flex;
    gap: 1.25rem;
  }

  .field-row .form-field {
    flex: 1;
  }

  @media (max-width: 640px) {
    .field-row {
      flex-direction: column;
    }
  }

  .form-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-fg);
  }

  .form-label-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .key-saved-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--color-success-dark);
    background: var(--color-success-subtle);
    border: 1px solid var(--color-success-border);
    border-radius: 9999px;
    white-space: nowrap;
  }

  .form-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-family: inherit;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-fg);
    outline: none;
    transition: all 0.15s ease;
    box-sizing: border-box;
  }

  .form-input:focus {
    border-color: var(--color-fg);
    box-shadow: 0 0 0 3px var(--color-focus-ring);
  }

  .form-input::placeholder {
    color: var(--color-muted-light);
  }

  .form-input-sm {
    max-width: 180px;
  }

  .form-textarea {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-family: inherit;
    line-height: 1.6;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-fg);
    outline: none;
    resize: vertical;
    min-height: 100px;
    transition: all 0.15s ease;
    box-sizing: border-box;
  }

  .form-textarea:focus {
    border-color: var(--color-fg);
    box-shadow: 0 0 0 3px var(--color-focus-ring);
  }

  .form-textarea::placeholder {
    color: var(--color-muted-light);
  }

  .input-group {
    display: flex;
    align-items: stretch;
    max-width: 180px;
  }

  .input-group-input {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: none;
  }

  .input-suffix {
    display: flex;
    align-items: center;
    padding: 0 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-muted);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-left: none;
    border-radius: 0 0.5rem 0.5rem 0;
    white-space: nowrap;
  }

  .form-hint {
    font-size: 0.75rem;
    color: var(--color-muted-light);
    margin: 0;
    line-height: 1.4;
  }

  .form-hint a {
    color: var(--color-fg);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .form-hint a:hover {
    color: var(--color-fg-tertiary);
  }

  /* Actions */
  .form-actions {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    padding-top: 0.25rem;
  }

  .saved-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-success-dark);
    background: var(--color-success-subtle);
    border: 1px solid var(--color-success-border);
    border-radius: 9999px;
  }

  .sound-options {
    display: flex;
    gap: 0.375rem;
  }
  .sound-option {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: inherit;
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    background: var(--color-bg);
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .sound-option:hover { color: var(--color-fg); border-color: var(--color-muted-lightest); }
  .sound-option.active {
    background: var(--color-primary-subtle, var(--color-accent));
    color: var(--color-primary, var(--color-fg));
    border-color: var(--color-primary, var(--color-fg));
    font-weight: 600;
  }

  .cleanup-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .scan-meta {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  /* ——— Bullet Diagnostic ——— */
  .diagnostic-active {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.625rem 0.875rem;
    background: var(--color-success-subtle);
    border: 1px solid var(--color-success-border);
    border-radius: 0.5rem;
  }

  .diagnostic-pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-success);
    flex-shrink: 0;
    animation: pulse-dot 2s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .diagnostic-label {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-success-dark);
    flex: 1;
  }

  .diagnostic-start {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

</style>

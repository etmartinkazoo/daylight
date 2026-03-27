<script>
  import { useForm, usePage, router } from "@inertiajs/svelte";
  import DaylightLayout from "./DaylightLayout.svelte";
  import Button from "@/components/ui/Button.svelte";
  import { getNotificationSound, setNotificationSound, previewSound, soundOptions } from "@/lib/notification-sounds.js";

  let { settings = {}, performance_issues = [], security_issues = [] } = $props();
  let selectedSound = $state(getNotificationSound());
  const pageStore = usePage();
  let base = $derived($pageStore.props?.base_path || "/daylight");

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

  function dismissIssue(id, status) {
    router.patch(`${base}/settings/performance_issues/${id}`, { new_status: status }, { preserveScroll: true });
  }

  function dismissSecIssue(id, status) {
    router.patch(`${base}/settings/security_issues/${id}`, { new_status: status }, { preserveScroll: true });
  }

  function formatKeyDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  }

  let expandedIssue = $state(null);
  let expandedSecIssue = $state(null);
  function toggleIssue(id) { expandedIssue = expandedIssue === id ? null : id; }
  function toggleSecIssue(id) { expandedSecIssue = expandedSecIssue === id ? null : id; }

  const severityColors = {
    critical: "issue-critical",
    warning: "issue-warning",
    info: "issue-info"
  };

  const typeLabels = {
    n_plus_one: "N+1 Query",
    slow_query: "Slow Query",
    counter_cache: "Counter Cache"
  };

  const secTypeLabels = {
    injection: "Injection",
    xss: "XSS",
    csrf: "CSRF",
    mass_assignment: "Mass Assignment",
    rce: "Remote Code Exec",
    redirect: "Unsafe Redirect",
    file_access: "File Access",
    config: "Configuration",
    auth: "Authentication",
    render: "Dynamic Render",
    other: "Other"
  };

  const secTypeColors = {
    injection: "sec-type-injection",
    xss: "sec-type-xss",
    csrf: "sec-type-csrf",
    rce: "sec-type-rce",
    mass_assignment: "sec-type-mass",
    redirect: "sec-type-redirect",
    file_access: "sec-type-file",
    config: "sec-type-config",
    auth: "sec-type-auth",
    render: "sec-type-render",
    other: "sec-type-other"
  };

  let secCriticalCount = $derived(security_issues.filter(i => i.severity === "critical").length);
  let secWarningCount = $derived(security_issues.filter(i => i.severity === "warning").length);

  const typeIcons = {
    n_plus_one: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
    slow_query: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z",
    counter_cache: "M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"
  };
</script>

<svelte:head><title>Settings — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Settings</h1>
      <p class="page-subtitle">Configure Daylight monitoring and notifications</p>
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
                  Saved{#if settings.gemini_api_key_saved_at}&nbsp;&middot;&nbsp;{formatKeyDate(settings.gemini_api_key_saved_at)}{/if}
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
                  Saved{#if settings.anthropic_api_key_saved_at}&nbsp;&middot;&nbsp;{formatKeyDate(settings.anthropic_api_key_saved_at)}{/if}
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
                  Saved{#if settings.github_api_token_saved_at}&nbsp;&middot;&nbsp;{formatKeyDate(settings.github_api_token_saved_at)}{/if}
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
                  Last scan: {formatKeyDate(settings.last_performance_scan_at)}
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
                  Last scan: {formatKeyDate(settings.last_security_scan_at)}
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

    <!-- Performance Issues -->
    {#if performance_issues.length > 0}
      <div class="issues-section">
        <div class="issues-header">
          <h2 class="section-title">Performance Issues</h2>
          <span class="issues-count">{performance_issues.length} open</span>
        </div>

        <div class="issues-list">
          {#each performance_issues as issue (issue.id)}
            <div class="issue-card {severityColors[issue.severity] || ''}">
              <button class="issue-summary" onclick={() => toggleIssue(issue.id)}>
                <div class="issue-left">
                  <span class="issue-type-badge {issue.issue_type}">{typeLabels[issue.issue_type] || issue.issue_type}</span>
                  <span class="issue-severity-dot {issue.severity}"></span>
                  <span class="issue-title">{issue.title}</span>
                </div>
                <div class="issue-right">
                  {#if issue.total_time_ms}
                    <span class="issue-stat">{issue.total_time_ms >= 1000 ? `${(issue.total_time_ms / 1000).toFixed(1)}s` : `${Math.round(issue.total_time_ms)}ms`} total</span>
                  {/if}
                  <span class="issue-stat">{issue.occurrences}x</span>
                  <svg class="issue-chevron" class:expanded={expandedIssue === issue.id} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </button>

              {#if expandedIssue === issue.id}
                <div class="issue-detail">
                  <p class="issue-desc">{issue.description}</p>

                  <div class="issue-meta-grid">
                    {#if issue.source_location}
                      <div class="issue-meta-item">
                        <span class="issue-meta-label">Source</span>
                        <code class="issue-meta-code">{issue.source_location}</code>
                      </div>
                    {/if}
                    {#if issue.controller_action}
                      <div class="issue-meta-item">
                        <span class="issue-meta-label">Controller</span>
                        <code class="issue-meta-code">{issue.controller_action}</code>
                      </div>
                    {/if}
                    {#if issue.avg_duration_ms}
                      <div class="issue-meta-item">
                        <span class="issue-meta-label">Avg Duration</span>
                        <span>{issue.avg_duration_ms.toFixed(1)}ms</span>
                      </div>
                    {/if}
                    {#if issue.detected_at}
                      <div class="issue-meta-item">
                        <span class="issue-meta-label">Detected</span>
                        <span>{formatKeyDate(issue.detected_at)}</span>
                      </div>
                    {/if}
                  </div>

                  {#if issue.sql_pattern}
                    <div class="issue-sql">
                      <span class="issue-sql-label">SQL Pattern</span>
                      <pre class="issue-sql-pre">{issue.sql_pattern}</pre>
                    </div>
                  {/if}

                  {#if issue.solution}
                    <div class="issue-solution">
                      <span class="issue-solution-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        AI Suggestion
                      </span>
                      <div class="issue-solution-body">{@html issue.solution.replace(/\n/g, '<br>')}</div>
                    </div>
                  {/if}

                  <div class="issue-actions">
                    <Button variant="outline" size="sm" onclick={() => dismissIssue(issue.id, "fixed")}>Mark Fixed</Button>
                    <Button variant="ghost" size="sm" onclick={() => dismissIssue(issue.id, "ignored")}>Ignore</Button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Security Issues -->
    {#if security_issues.length > 0}
      <div class="issues-section">
        <div class="issues-header">
          <h2 class="section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Security Issues
          </h2>
          <div class="sec-counts">
            {#if secCriticalCount > 0}
              <span class="issues-count sec-count-critical">{secCriticalCount} critical</span>
            {/if}
            {#if secWarningCount > 0}
              <span class="issues-count sec-count-warning">{secWarningCount} warning</span>
            {/if}
            <span class="issues-count">{security_issues.length} total</span>
          </div>
        </div>

        <div class="issues-list">
          {#each security_issues as issue (issue.id)}
            <div class="issue-card {severityColors[issue.severity] || ''}">
              <button class="issue-summary" onclick={() => toggleSecIssue(issue.id)}>
                <div class="issue-left">
                  <span class="sec-type-badge {secTypeColors[issue.issue_type] || ''}">{secTypeLabels[issue.issue_type] || issue.warning_type}</span>
                  <span class="issue-severity-dot {issue.severity}"></span>
                  <span class="issue-title">{issue.title}</span>
                </div>
                <div class="issue-right">
                  {#if issue.confidence}
                    <span class="sec-confidence sec-conf-{issue.confidence}">{issue.confidence}</span>
                  {/if}
                  <svg class="issue-chevron" class:expanded={expandedSecIssue === issue.id} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </button>

              {#if expandedSecIssue === issue.id}
                <div class="issue-detail">
                  <p class="issue-desc">{issue.description}</p>

                  <div class="issue-meta-grid">
                    {#if issue.file_path}
                      <div class="issue-meta-item">
                        <span class="issue-meta-label">File</span>
                        <code class="issue-meta-code">{issue.file_path}{#if issue.line_number}:{issue.line_number}{/if}</code>
                      </div>
                    {/if}
                    {#if issue.warning_type}
                      <div class="issue-meta-item">
                        <span class="issue-meta-label">Warning Type</span>
                        <span>{issue.warning_type}</span>
                      </div>
                    {/if}
                    {#if issue.check_name}
                      <div class="issue-meta-item">
                        <span class="issue-meta-label">Check</span>
                        <span>{issue.check_name}</span>
                      </div>
                    {/if}
                    {#if issue.detected_at}
                      <div class="issue-meta-item">
                        <span class="issue-meta-label">Detected</span>
                        <span>{formatKeyDate(issue.detected_at)}</span>
                      </div>
                    {/if}
                  </div>

                  {#if issue.code_snippet}
                    <div class="issue-sql">
                      <span class="issue-sql-label">Vulnerable Code</span>
                      <pre class="issue-sql-pre">{issue.code_snippet}</pre>
                    </div>
                  {/if}

                  {#if issue.solution}
                    <div class="issue-solution sec-solution">
                      <span class="issue-solution-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        AI Fix Suggestion
                      </span>
                      <div class="issue-solution-body">{@html issue.solution.replace(/\n/g, '<br>')}</div>
                    </div>
                  {/if}

                  <div class="issue-actions">
                    {#if issue.link}
                      <a href={issue.link} target="_blank" rel="noopener" class="sec-ref-link">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        Brakeman docs
                      </a>
                    {/if}
                    <Button variant="outline" size="sm" onclick={() => dismissSecIssue(issue.id, "fixed")}>Mark Fixed</Button>
                    <Button variant="ghost" size="sm" onclick={() => dismissSecIssue(issue.id, "ignored")}>Ignore</Button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</DaylightLayout>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
  }

  .page-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .page-title {
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--color-fg);
    margin: 0;
    letter-spacing: -0.01em;
  }

  .page-subtitle {
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

  /* ——— Performance Issues Section ——— */
  .issues-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .issues-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .issues-count {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background: var(--color-warning-subtle);
    color: var(--color-warning-dark);
    border: 1px solid var(--color-warning-border);
  }

  .issues-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .issue-card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
    transition: border-color 0.15s;
  }

  .issue-card.issue-critical { border-left: 3px solid var(--color-danger); }
  .issue-card.issue-warning { border-left: 3px solid var(--color-warning); }
  .issue-card.issue-info { border-left: 3px solid var(--color-info); }

  .issue-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    background: none;
    font-family: inherit;
    cursor: pointer;
    gap: 1rem;
    text-align: left;
    transition: background 0.1s;
  }

  .issue-summary:hover {
    background: var(--color-surface);
  }

  .issue-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    min-width: 0;
    flex: 1;
  }

  .issue-type-badge {
    flex-shrink: 0;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    white-space: nowrap;
  }

  .issue-type-badge.n_plus_one {
    background: var(--color-danger-subtle);
    color: var(--color-danger);
  }

  .issue-type-badge.slow_query {
    background: var(--color-warning-subtle);
    color: var(--color-warning-dark);
  }

  .issue-type-badge.counter_cache {
    background: var(--color-info-subtle);
    color: var(--color-info);
  }

  .issue-severity-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .issue-severity-dot.critical { background: var(--color-danger); }
  .issue-severity-dot.warning { background: var(--color-warning); }
  .issue-severity-dot.info { background: var(--color-info); }

  .issue-title {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-fg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .issue-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .issue-stat {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
  }

  .issue-chevron {
    color: var(--color-muted-light);
    transition: transform 0.15s;
  }

  .issue-chevron.expanded {
    transform: rotate(180deg);
  }

  .issue-detail {
    padding: 0 1rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    border-top: 1px solid var(--color-accent);
  }

  .issue-desc {
    font-size: 0.8125rem;
    color: var(--color-muted);
    margin: 0.875rem 0 0;
    line-height: 1.5;
  }

  .issue-meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.5rem;
  }

  .issue-meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .issue-meta-label {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted-light);
  }

  .issue-meta-code {
    font-size: 0.75rem;
    font-family: "SF Mono", Monaco, Menlo, monospace;
    color: var(--color-fg);
    background: var(--color-accent);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    width: fit-content;
  }

  .issue-sql {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .issue-sql-label {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted-light);
  }

  .issue-sql-pre {
    font-size: 0.75rem;
    font-family: "SF Mono", Monaco, Menlo, monospace;
    background: var(--color-surface);
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    line-height: 1.6;
    color: var(--color-fg);
  }

  .issue-solution {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    background: var(--color-primary-subtle);
    border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
    border-radius: 0.5rem;
    padding: 0.75rem;
  }

  .issue-solution-label {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-primary);
  }

  .issue-solution-body {
    font-size: 0.8125rem;
    line-height: 1.6;
    color: var(--color-fg);
  }

  .issue-solution-body :global(code) {
    font-size: 0.75rem;
    font-family: "SF Mono", Monaco, Menlo, monospace;
    background: var(--color-accent);
    padding: 0.0625rem 0.375rem;
    border-radius: 0.25rem;
  }

  .issue-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.25rem;
  }

  /* ——— Security Issues ——— */
  .sec-counts {
    display: flex;
    gap: 0.375rem;
  }

  .sec-count-critical {
    background: var(--color-danger-subtle);
    color: var(--color-danger);
    border-color: var(--color-danger-border);
  }

  .sec-count-warning {
    background: var(--color-warning-subtle);
    color: var(--color-warning-dark);
    border-color: var(--color-warning-border);
  }

  .sec-type-badge {
    flex-shrink: 0;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    white-space: nowrap;
  }

  .sec-type-injection, .sec-type-rce {
    background: var(--color-danger-subtle);
    color: var(--color-danger);
  }

  .sec-type-xss {
    background: var(--color-warning-subtle);
    color: var(--color-warning-dark);
  }

  .sec-type-csrf, .sec-type-auth {
    background: var(--color-purple-subtle);
    color: var(--color-purple);
  }

  .sec-type-mass, .sec-type-redirect {
    background: var(--color-info-subtle);
    color: var(--color-info);
  }

  .sec-type-file, .sec-type-render {
    background: var(--color-warning-subtle);
    color: var(--color-warning-darker);
  }

  .sec-type-config, .sec-type-other {
    background: var(--color-accent);
    color: var(--color-muted);
  }

  .sec-confidence {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.0625rem 0.375rem;
    border-radius: 0.25rem;
  }

  .sec-conf-high {
    background: var(--color-danger-subtle);
    color: var(--color-danger);
  }

  .sec-conf-medium {
    background: var(--color-warning-subtle);
    color: var(--color-warning-dark);
  }

  .sec-conf-weak {
    background: var(--color-accent);
    color: var(--color-muted);
  }

  .sec-solution {
    background: var(--color-danger-subtle);
    border-color: color-mix(in srgb, var(--color-danger) 20%, transparent);
  }

  .sec-solution .issue-solution-label {
    color: var(--color-danger);
  }

  .sec-ref-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-info);
    text-decoration: none;
    margin-right: auto;
  }

  .sec-ref-link:hover {
    text-decoration: underline;
  }
</style>

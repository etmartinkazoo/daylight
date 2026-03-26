<script>
  import { useForm, usePage, router } from "@inertiajs/svelte";
  import DaylightLayout from "./DaylightLayout.svelte";
  import Button from "@/components/ui/Button.svelte";

  let { settings = {} } = $props();
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
    "settings[sample_rate]": settings.sample_rate || "1.0",
  });

  function handleSubmit(e) {
    e.preventDefault();
    $form.patch(`${base}/settings`, { preserveScroll: true });
  }

  let cleanupRunning = $state(false);
  let cleanupDone = $state(false);
  let testNotifRunning = $state(false);
  let testNotifDone = $state(false);

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
            <p class="form-hint">Used by the AI tab to analyze errors, queries, and requests. Get a key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>.</p>
          </div>

          <div class="form-field">
            <label class="form-label" for="ai_context_notes">Context Notes</label>
            <textarea id="ai_context_notes" class="form-textarea" rows="5" placeholder="e.g. This app uses multi-tenant SQLite via activerecord-tenanted. The main models are Partner, Project, Todo, Service..." bind:value={$form["settings[ai_context_notes]"]}></textarea>
            <p class="form-hint">Describe your app's architecture, key patterns, or common pitfalls. This is prepended to every AI conversation in errorwatch.</p>
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
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.01em;
  }

  .page-subtitle {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* Section cards */
  .section-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .section-header {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
  }

  .section-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
  }

  .section-desc {
    font-size: 0.8125rem;
    color: #64748b;
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
    color: #0f172a;
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
    color: #16a34a;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 9999px;
    white-space: nowrap;
  }

  .form-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    font-family: inherit;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    background: #fff;
    color: #0f172a;
    outline: none;
    transition: all 0.15s ease;
    box-sizing: border-box;
  }

  .form-input:focus {
    border-color: #0f172a;
    box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
  }

  .form-input::placeholder {
    color: #94a3b8;
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
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    background: #fff;
    color: #0f172a;
    outline: none;
    resize: vertical;
    min-height: 100px;
    transition: all 0.15s ease;
    box-sizing: border-box;
  }

  .form-textarea:focus {
    border-color: #0f172a;
    box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
  }

  .form-textarea::placeholder {
    color: #94a3b8;
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
    color: #64748b;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: none;
    border-radius: 0 0.5rem 0.5rem 0;
    white-space: nowrap;
  }

  .form-hint {
    font-size: 0.75rem;
    color: #94a3b8;
    margin: 0;
    line-height: 1.4;
  }

  .form-hint a {
    color: #0f172a;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .form-hint a:hover {
    color: #334155;
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
    color: #16a34a;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 9999px;
  }

  .cleanup-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
</style>

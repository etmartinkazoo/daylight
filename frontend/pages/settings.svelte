<script>
  import { useForm } from "@inertiajs/svelte";
  import DaylightLayout from "./DaylightLayout.svelte";

  let { settings = {} } = $props();

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
  });

  function handleSubmit(e) {
    e.preventDefault();
    $form.patch("/daylight/settings", { preserveScroll: true });
  }
</script>

<svelte:head><title>Settings — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="ew-page">
    <h1 class="ew-page-title">Settings</h1>

    <form class="ew-form" onsubmit={handleSubmit}>

      <!-- Source Code -->
      <fieldset class="ew-fieldset">
        <legend class="ew-legend">Source Code</legend>
        <p class="ew-legend-desc">Connect a GitHub repo so AI can reference your code when diagnosing errors.</p>

        <div class="ew-field">
          <label class="ew-label" for="github_repo_url">GitHub Repo URL</label>
          <input id="github_repo_url" type="url" class="ew-input" placeholder="https://github.com/org/repo" bind:value={$form["settings[github_repo_url]"]} />
          <p class="ew-hint">Full URL to your GitHub repository.</p>
        </div>

        <div class="ew-field">
          <label class="ew-label" for="github_default_branch">Default Branch</label>
          <input id="github_default_branch" type="text" class="ew-input ew-input-sm" placeholder="main" bind:value={$form["settings[github_default_branch]"]} />
        </div>
      </fieldset>

      <!-- Notifications -->
      <fieldset class="ew-fieldset">
        <legend class="ew-legend">Notifications</legend>
        <p class="ew-legend-desc">Get notified when new errors occur or existing ones recur.</p>

        <div class="ew-field">
          <label class="ew-label" for="notification_emails">Email Recipients</label>
          <input id="notification_emails" type="text" class="ew-input" placeholder="dev@example.com, ops@example.com" bind:value={$form["settings[notification_emails]"]} />
          <p class="ew-hint">Comma-separated email addresses to notify on new/recurring errors.</p>
        </div>

        <div class="ew-field">
          <label class="ew-label" for="slack_webhook_url">Slack Webhook URL</label>
          <input id="slack_webhook_url" type="url" class="ew-input" placeholder="https://hooks.slack.com/services/..." bind:value={$form["settings[slack_webhook_url]"]} />
          <p class="ew-hint">Incoming webhook URL for Slack notifications.</p>
        </div>
      </fieldset>

      <!-- Thresholds -->
      <fieldset class="ew-fieldset">
        <legend class="ew-legend">Thresholds</legend>
        <p class="ew-legend-desc">Control what gets tracked.</p>

        <div class="ew-field-row">
          <div class="ew-field">
            <label class="ew-label" for="slow_request_threshold_ms">Slow Request Threshold</label>
            <div class="ew-input-group">
              <input id="slow_request_threshold_ms" type="number" class="ew-input ew-input-sm" bind:value={$form["settings[slow_request_threshold_ms]"]} />
              <span class="ew-input-suffix">ms</span>
            </div>
            <p class="ew-hint">Requests slower than this appear on the Requests page.</p>
          </div>

          <div class="ew-field">
            <label class="ew-label" for="slow_query_threshold_ms">Slow Query Threshold</label>
            <div class="ew-input-group">
              <input id="slow_query_threshold_ms" type="number" class="ew-input ew-input-sm" bind:value={$form["settings[slow_query_threshold_ms]"]} />
              <span class="ew-input-suffix">ms</span>
            </div>
            <p class="ew-hint">SQL queries slower than this are recorded.</p>
          </div>
        </div>

        <div class="ew-field">
          <label class="ew-label" for="retention_days">Data Retention</label>
          <div class="ew-input-group">
            <input id="retention_days" type="number" class="ew-input ew-input-sm" bind:value={$form["settings[retention_days]"]} />
            <span class="ew-input-suffix">days</span>
          </div>
          <p class="ew-hint">Occurrences, requests, queries, and job records older than this are purged.</p>
        </div>
      </fieldset>

      <!-- AI -->
      <fieldset class="ew-fieldset">
        <legend class="ew-legend">AI</legend>
        <p class="ew-legend-desc">Configure the AI assistant for the sheet AI tab.</p>

        <div class="ew-field">
          <label class="ew-label" for="gemini_api_key">Gemini API Key</label>
          <input id="gemini_api_key" type="password" class="ew-input" placeholder={settings.gemini_api_key ? "Key saved — leave blank to keep" : "Enter API key"} bind:value={$form["settings[gemini_api_key]"]} autocomplete="off" />
          <p class="ew-hint">Used by the AI tab to analyze errors, queries, and requests. Get a key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>.</p>
        </div>

        <div class="ew-field">
          <label class="ew-label" for="ai_context_notes">Context Notes</label>
          <textarea id="ai_context_notes" class="ew-textarea" rows="5" placeholder="e.g. This app uses multi-tenant SQLite via activerecord-tenanted. The main models are Partner, Project, Todo, Service..." bind:value={$form["settings[ai_context_notes]"]}></textarea>
          <p class="ew-hint">Describe your app's architecture, key patterns, or common pitfalls. This is prepended to every AI conversation in errorwatch.</p>
        </div>
      </fieldset>

      <div class="ew-actions">
        <button type="submit" class="ew-save" disabled={$form.processing}>
          {$form.processing ? "Saving..." : "Save Settings"}
        </button>
        {#if $form.recentlySuccessful}
          <span class="ew-saved">Saved</span>
        {/if}
      </div>
    </form>
  </div>
</DaylightLayout>

<style>
  .ew-page { display: flex; flex-direction: column; gap: 1.5rem; }
  .ew-page-title { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0; }

  .ew-form { display: flex; flex-direction: column; gap: 1.5rem; }

  .ew-fieldset {
    border: 1px solid #e5e7eb;
    padding: 1.25rem;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .ew-legend {
    font-size: 0.875rem;
    font-weight: 700;
    color: #1e293b;
    padding: 0 0.25rem;
  }

  .ew-legend-desc {
    font-size: 0.8125rem;
    color: #6b7280;
    margin: -0.5rem 0 0;
  }

  .ew-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .ew-field-row {
    display: flex;
    gap: 1rem;
    .ew-field { flex: 1; }

    @media (max-width: 640px) { flex-direction: column; }
  }

  .ew-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #374151;
  }

  .ew-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    font-family: inherit;
    border: 1px solid #e5e7eb;
    background: #fff;
    color: #1e293b;
    outline: none;

    &:focus { border-color: #213258; box-shadow: 0 0 0 2px rgba(33,50,88,0.1); }
    &::placeholder { color: #9ca3af; }
  }

  .ew-input-sm { max-width: 160px; }

  .ew-input-group {
    display: flex;
    align-items: center;
    gap: 0;
  }

  .ew-input-group .ew-input {
    border-right: none;
  }

  .ew-input-suffix {
    padding: 0.5rem 0.625rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-left: none;
    white-space: nowrap;
  }

  .ew-textarea {
    width: 100%;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    font-family: inherit;
    line-height: 1.5;
    border: 1px solid #e5e7eb;
    background: #fff;
    color: #1e293b;
    outline: none;
    resize: vertical;
    min-height: 80px;

    &:focus { border-color: #213258; box-shadow: 0 0 0 2px rgba(33,50,88,0.1); }
    &::placeholder { color: #9ca3af; }
  }

  .ew-hint {
    font-size: 0.6875rem;
    color: #9ca3af;
    margin: 0;
  }

  .ew-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .ew-save {
    padding: 0.5rem 1.25rem;
    font-size: 0.8125rem;
    font-weight: 600;
    font-family: inherit;
    border: none;
    background: #213258;
    color: #fff;
    cursor: pointer;

    &:hover:not(:disabled) { background: #1a2847; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  .ew-saved {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #16a34a;
  }
</style>

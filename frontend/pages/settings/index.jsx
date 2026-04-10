import { useState } from "react";
import { Form } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupInput } from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SelectInput } from "@/components/ui/select-input";
import { CheckboxInput } from "@/components/ui/checkbox-input";
import { Alert, AlertDescription, AlertAction } from "@/components/ui/alert";
import { getNotificationSound, setNotificationSound, previewSound, soundOptions } from "@/lib/notification-sounds.js";
import { timeAgo } from "@/lib/formatters.js";
import PerformanceIssues from "@/components/settings/PerformanceIssues.jsx";
import SecurityIssues from "@/components/settings/SecurityIssues.jsx";
import { FormField } from "@/components/ui/form-field";
import { SectionCard } from "@/components/ui/section-card";

export default function SettingsIndex({
  settings = {}, performance_issues = [], security_issues = [], base_path: base = "/daylight",
}) {
  const [selectedSound, setSelectedSound] = useState(getNotificationSound());
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [cleanupDone, setCleanupDone] = useState(false);
  const [testNotifRunning, setTestNotifRunning] = useState(false);
  const [testNotifDone, setTestNotifDone] = useState(false);
  const [scanRunning, setScanRunning] = useState(false);
  const [scanTriggered, setScanTriggered] = useState(false);
  const [secScanRunning, setSecScanRunning] = useState(false);
  const [secScanTriggered, setSecScanTriggered] = useState(false);
  const [bulletDuration, setBulletDuration] = useState("30");
  const [bulletStarting, setBulletStarting] = useState(false);

  // Controlled state for select/checkbox fields (Radix UI requires controlled values)
  const [aiModel, setAiModel] = useState(settings.default_ai_model || "gemini-2.5-flash");
  const [solutionsScan, setSolutionsScan] = useState(String(settings.solutions_scan_enabled) === "true");
  const [perfScanEnabled, setPerfScanEnabled] = useState(String(settings.performance_scan_enabled) === "true");
  const [perfScanInterval, setPerfScanInterval] = useState(settings.performance_scan_interval || "daily");
  const [secScanEnabled, setSecScanEnabled] = useState(String(settings.security_scan_enabled) === "true");
  const [secScanInterval, setSecScanInterval] = useState(settings.security_scan_interval || "daily");
  const [secScanMinConf, setSecScanMinConf] = useState(settings.security_scan_min_confidence || "1");

  const bulletTimeRemaining = (() => {
    if (!settings.bullet_diagnostic_active || !settings.bullet_diagnostic_expires_at) return null;
    const expires = new Date(settings.bullet_diagnostic_expires_at);
    return Math.max(0, Math.round((expires - new Date()) / 60000));
  })();

  // Action form callbacks
  function onCleanupSubmit() { setCleanupRunning(true); setCleanupDone(false); }
  function onCleanupSuccess() { setCleanupRunning(false); setCleanupDone(true); }
  function onCleanupError() { setCleanupRunning(false); }
  function onNotifSubmit() { setTestNotifRunning(true); setTestNotifDone(false); }
  function onNotifSuccess() { setTestNotifRunning(false); setTestNotifDone(true); }
  function onNotifError() { setTestNotifRunning(false); }
  function onPerfScanSubmit() { setScanRunning(true); setScanTriggered(false); }
  function onPerfScanSuccess() { setScanRunning(false); setScanTriggered(true); }
  function onPerfScanError() { setScanRunning(false); }
  function onSecScanSubmit() { setSecScanRunning(true); setSecScanTriggered(false); }
  function onSecScanSuccess() { setSecScanRunning(false); setSecScanTriggered(true); }
  function onSecScanError() { setSecScanRunning(false); }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure Daylight monitoring and notifications</p>
        </div>

        <Form
          method="patch"
          action={`${base}/settings`}
          options={{ preserveScroll: true }}
          className="flex flex-col gap-5"
        >
          {({ processing, recentlySuccessful, errors }) => (
            <>
              {/* Source Code */}
              <SectionCard title="Source Code" description="Connect a GitHub repo so AI can reference your code when diagnosing errors.">
                <FormField label="GitHub Repo URL" htmlFor="github_repo_url" hint="Full URL to your GitHub repository." error={errors.github_repo_url}>
                  <Input id="github_repo_url" name="settings[github_repo_url]" type="url"
                    placeholder="https://github.com/org/repo"
                    defaultValue={settings.github_repo_url || ""} />
                </FormField>
                <FormField label="Default Branch" htmlFor="github_default_branch" error={errors.github_default_branch}>
                  <Input id="github_default_branch" name="settings[github_default_branch]"
                    placeholder="main" className="max-w-[180px]"
                    defaultValue={settings.github_default_branch || "main"} />
                </FormField>
              </SectionCard>

              {/* Notifications */}
              <SectionCard title="Notifications" description="Get notified when new errors occur or existing ones recur.">
                <FormField label="Email Recipients" htmlFor="notification_emails" hint="Comma-separated email addresses to notify on new/recurring errors." error={errors.notification_emails}>
                  <Input id="notification_emails" name="settings[notification_emails]"
                    placeholder="dev@example.com, ops@example.com"
                    defaultValue={settings.notification_emails || ""} />
                </FormField>
                <FormField label="Slack Webhook URL" htmlFor="slack_webhook_url" hint="Incoming webhook URL for Slack notifications." error={errors.slack_webhook_url}>
                  <Input id="slack_webhook_url" name="settings[slack_webhook_url]" type="url"
                    placeholder="https://hooks.slack.com/services/..."
                    defaultValue={settings.slack_webhook_url || ""} />
                </FormField>
                <FormField label="Chat Notification Sound" hint="Sound played when AI chat responses complete.">
                  <div className="flex gap-1.5 flex-wrap">
                    {soundOptions.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        variant={selectedSound === opt.value ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => {
                          setSelectedSound(opt.value);
                          setNotificationSound(opt.value);
                          if (opt.value !== "none") previewSound(opt.value);
                        }}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </FormField>
                <FormField label="" hint="Send a test notification to verify your email and Slack settings.">
                  <div className="flex items-center gap-2">
                    <Form method="post" action={`${base}/settings/notification_test`} options={{ preserveScroll: true, onBefore: onNotifSubmit, onSuccess: onNotifSuccess, onError: onNotifError }}>
                      {() => (
                        <Button type="submit" variant="outline" size="sm" disabled={testNotifRunning}>
                          {testNotifRunning ? "Sending..." : "Send Test Notification"}
                        </Button>
                      )}
                    </Form>
                    {testNotifDone && <Badge variant="secondary">Test notification sent</Badge>}
                  </div>
                </FormField>
              </SectionCard>

              {/* Thresholds */}
              <SectionCard title="Thresholds" description="Control what gets tracked.">
                <div className="grid grid-cols-2 gap-5">
                  <FormField label="Slow Request Threshold" htmlFor="slow_request_threshold_ms" hint="Requests slower than this appear on the Requests page." error={errors.slow_request_threshold_ms}>
                    <InputGroup className="max-w-[200px]">
                      <InputGroupInput id="slow_request_threshold_ms" name="settings[slow_request_threshold_ms]" type="number"
                        defaultValue={settings.slow_request_threshold_ms || "500"} />
                      <InputGroupAddon align="inline-end"><InputGroupText>ms</InputGroupText></InputGroupAddon>
                    </InputGroup>
                  </FormField>
                  <FormField label="Slow Query Threshold" htmlFor="slow_query_threshold_ms" hint="SQL queries slower than this are recorded." error={errors.slow_query_threshold_ms}>
                    <InputGroup className="max-w-[200px]">
                      <InputGroupInput id="slow_query_threshold_ms" name="settings[slow_query_threshold_ms]" type="number"
                        defaultValue={settings.slow_query_threshold_ms || "50"} />
                      <InputGroupAddon align="inline-end"><InputGroupText>ms</InputGroupText></InputGroupAddon>
                    </InputGroup>
                  </FormField>
                </div>
                <FormField label="Data Retention" htmlFor="retention_days" hint="Occurrences, requests, queries, and job records older than this are purged." error={errors.retention_days}>
                  <InputGroup className="max-w-[200px]">
                    <InputGroupInput id="retention_days" name="settings[retention_days]" type="number"
                      defaultValue={settings.retention_days || "30"} />
                    <InputGroupAddon align="inline-end"><InputGroupText>days</InputGroupText></InputGroupAddon>
                  </InputGroup>
                </FormField>
                <FormField label="" hint="Immediately purge data older than the retention period.">
                  <div className="flex items-center gap-2">
                    <Form method="post" action={`${base}/settings/cleanup`} options={{ preserveScroll: true, onBefore: onCleanupSubmit, onSuccess: onCleanupSuccess, onError: onCleanupError }}>
                      {() => (
                        <Button type="submit" variant="outline" size="sm" disabled={cleanupRunning}>
                          {cleanupRunning ? "Running..." : "Run Cleanup Now"}
                        </Button>
                      )}
                    </Form>
                    {cleanupDone && <Badge variant="secondary">Cleanup complete</Badge>}
                  </div>
                </FormField>
              </SectionCard>

              {/* Sampling */}
              <SectionCard title="Sampling" description="Control how much data Daylight captures. Exceptions are always captured at 100%.">
                <FormField label="Global Sample Rate" htmlFor="sample_rate" hint="1.0 = capture everything, 0.5 = capture 50% of requests. Exceptions are always captured regardless of this setting." error={errors.sample_rate}>
                  <InputGroup className="max-w-[200px]">
                    <InputGroupInput id="sample_rate" name="settings[sample_rate]" type="number"
                      step="0.1" min="0" max="1"
                      defaultValue={settings.sample_rate || "1.0"} />
                    <InputGroupAddon align="inline-end"><InputGroupText>0–1</InputGroupText></InputGroupAddon>
                  </InputGroup>
                </FormField>
              </SectionCard>

              {/* AI */}
              <SectionCard title="AI" description="Configure the AI assistant for the sheet AI tab.">
                <FormField
                  label="Gemini API Key" htmlFor="gemini_api_key"
                  saved={!!settings.gemini_api_key} savedAt={settings.gemini_api_key_saved_at}
                  error={errors.gemini_api_key}
                  hint={<>Get a key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="underline underline-offset-2">Google AI Studio</a>. Enables Gemini Flash and Pro models.</>}
                >
                  <Input id="gemini_api_key" name="settings[gemini_api_key]" type="password"
                    placeholder={settings.gemini_api_key ? "Key saved — leave blank to keep" : "Enter API key"}
                    defaultValue="" autoComplete="off" />
                </FormField>

                <FormField
                  label="Anthropic API Key" htmlFor="anthropic_api_key"
                  saved={!!settings.anthropic_api_key} savedAt={settings.anthropic_api_key_saved_at}
                  error={errors.anthropic_api_key}
                  hint={<>Get a key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" className="underline underline-offset-2">Anthropic Console</a>. Enables Claude Haiku, Sonnet, and Opus models.</>}
                >
                  <Input id="anthropic_api_key" name="settings[anthropic_api_key]" type="password"
                    placeholder={settings.anthropic_api_key ? "Key saved — leave blank to keep" : "sk-ant-..."}
                    defaultValue="" autoComplete="off" />
                </FormField>

                <FormField label="Default Model" htmlFor="default_ai_model" hint="Default model for all AI features: scanners, solutions, and chat. Can be overridden per chat." error={errors.default_ai_model}>
                  <SelectInput
                    name="settings[default_ai_model]"
                    value={aiModel}
                    onValueChange={setAiModel}
                    className="w-[240px]"
                    options={[
                      { group: "Gemini", options: [
                        { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
                        { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
                      ]},
                      { group: "Claude", options: [
                        { value: "claude-haiku-4-5-20251001", label: "Claude Haiku" },
                        { value: "claude-sonnet-4-6", label: "Claude Sonnet" },
                        { value: "claude-opus-4-6", label: "Claude Opus" },
                      ]},
                    ]}
                  />
                </FormField>

                <FormField label="Context Notes" htmlFor="ai_context_notes" hint="Describe your app's architecture, key patterns, or common pitfalls. This is prepended to every AI conversation." error={errors.ai_context_notes}>
                  <Textarea id="ai_context_notes" name="settings[ai_context_notes]" rows={5}
                    placeholder="e.g. This app uses multi-tenant SQLite via activerecord-tenanted. The main models are Partner, Project, Todo, Service..."
                    defaultValue={settings.ai_context_notes || ""} />
                </FormField>

                <FormField
                  label="GitHub API Token" htmlFor="github_api_token"
                  saved={!!settings.github_api_token} savedAt={settings.github_api_token_saved_at}
                  error={errors.github_api_token}
                  hint={<>Personal access token with <code className="text-sm bg-muted px-1 rounded">repo</code> scope. Required for Solutions to push PRs to GitHub.</>}
                >
                  <Input id="github_api_token" name="settings[github_api_token]" type="password"
                    placeholder={settings.github_api_token ? "Token saved — leave blank to keep" : "ghp_..."}
                    defaultValue="" autoComplete="off" />
                </FormField>

                <FormField label="Auto-Generate Solutions" htmlFor="solutions_scan_enabled" error={errors.solutions_scan_enabled} hint="Automatically generate AI fix proposals for open performance and security issues once per day.">
                  <CheckboxInput
                    name="settings[solutions_scan_enabled]"
                    checked={solutionsScan}
                    onCheckedChange={setSolutionsScan}
                    label="Enabled (daily)"
                  />
                </FormField>
              </SectionCard>

              {/* Performance Scanning */}
              <SectionCard title="Performance Scanning" description="Automatically detect N+1 queries, slow query patterns, and counter cache opportunities.">
                <div className="grid grid-cols-2 gap-5">
                  <FormField label="Auto Scan" htmlFor="performance_scan_enabled" error={errors.performance_scan_enabled} hint="Automatically scan for performance issues on a schedule.">
                    <CheckboxInput
                      name="settings[performance_scan_enabled]"
                      checked={perfScanEnabled}
                      onCheckedChange={setPerfScanEnabled}
                      label="Enabled"
                    />
                  </FormField>
                  <FormField label="Scan Interval" htmlFor="performance_scan_interval" error={errors.performance_scan_interval} hint="How often to run the performance scan.">
                    <SelectInput
                      name="settings[performance_scan_interval]"
                      value={perfScanInterval}
                      onValueChange={setPerfScanInterval}
                      className="w-[160px]"
                      options={[
                        { value: "hourly", label: "Every hour" },
                        { value: "6h", label: "Every 6 hours" },
                        { value: "12h", label: "Every 12 hours" },
                        { value: "daily", label: "Daily" },
                        { value: "weekly", label: "Weekly" },
                      ]}
                    />
                  </FormField>
                </div>

                <FormField label="" hint="Run a performance scan immediately. Analyzes the last 24h of query data. AI solutions require a Gemini API key.">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Form method="post" action={`${base}/settings/performance_scan`} options={{ preserveScroll: true, onBefore: onPerfScanSubmit, onSuccess: onPerfScanSuccess, onError: onPerfScanError }} className="inline">
                      {() => (
                        <Button type="submit" variant="outline" size="sm" disabled={scanRunning}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                          {scanRunning ? "Starting..." : "Scan Now"}
                        </Button>
                      )}
                    </Form>
                    {scanTriggered && <Badge variant="secondary">Scan queued</Badge>}
                    {settings.last_performance_scan_at && (
                      <span className="text-sm text-muted-foreground">
                        Last scan: {timeAgo(settings.last_performance_scan_at)}
                        {settings.last_performance_scan_count && <> · {settings.last_performance_scan_count} issue{settings.last_performance_scan_count === "1" ? "" : "s"} found</>}
                      </span>
                    )}
                  </div>
                </FormField>

                <FormField label="Live N+1 Detection (Bullet)" hint="Enable Bullet live detection in production for a limited window. Instruments 5% of requests to detect N+1 queries, unused eager loads, and counter cache opportunities. Always active in development.">
                  {settings.bullet_diagnostic_active ? (
                    <Alert variant="success" className="py-2">
                      <span className="size-2 rounded-full bg-green-500 animate-pulse shrink-0 mt-0.5" />
                      <AlertDescription className="text-green-700 dark:text-green-400">
                        Live detection active — {bulletTimeRemaining}min remaining
                      </AlertDescription>
                      <AlertAction>
                        <Form method="delete" action={`${base}/settings/bullet_diagnostic`} options={{ preserveScroll: true }}>
                          {() => <Button type="submit" variant="outline" size="sm">Stop</Button>}
                        </Form>
                      </AlertAction>
                    </Alert>
                  ) : (
                    <Form method="post" action={`${base}/settings/bullet_diagnostic`} data={{ duration: bulletDuration }} options={{ preserveScroll: true, onFinish: () => setBulletStarting(false) }}>
                      {() => (
                        <div className="flex items-center gap-2">
                          <Select value={bulletDuration} onValueChange={setBulletDuration}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5">5 minutes</SelectItem>
                              <SelectItem value="15">15 minutes</SelectItem>
                              <SelectItem value="30">30 minutes</SelectItem>
                              <SelectItem value="60">1 hour</SelectItem>
                              <SelectItem value="120">2 hours</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button type="submit" variant="outline" size="sm" disabled={bulletStarting} onClick={() => setBulletStarting(true)}>
                            {bulletStarting ? "Starting..." : "Start Diagnostic"}
                          </Button>
                        </div>
                      )}
                    </Form>
                  )}
                </FormField>
              </SectionCard>

              {/* Security Scanning */}
              <SectionCard title="Security Scanning" description="Run Brakeman static analysis to detect SQL injection, XSS, CSRF, and other security vulnerabilities.">
                <div className="grid grid-cols-3 gap-5">
                  <FormField label="Auto Scan" htmlFor="security_scan_enabled" error={errors.security_scan_enabled} hint="Automatically run Brakeman security scans on a schedule.">
                    <CheckboxInput
                      name="settings[security_scan_enabled]"
                      checked={secScanEnabled}
                      onCheckedChange={setSecScanEnabled}
                      label="Enabled"
                    />
                  </FormField>
                  <FormField label="Scan Interval" htmlFor="security_scan_interval" error={errors.security_scan_interval}>
                    <SelectInput
                      name="settings[security_scan_interval]"
                      value={secScanInterval}
                      onValueChange={setSecScanInterval}
                      className="w-[150px]"
                      options={[
                        { value: "6h", label: "Every 6 hours" },
                        { value: "12h", label: "Every 12 hours" },
                        { value: "daily", label: "Daily" },
                        { value: "weekly", label: "Weekly" },
                      ]}
                    />
                  </FormField>
                  <FormField label="Min Confidence" htmlFor="security_scan_min_confidence" error={errors.security_scan_min_confidence} hint="Filter out low-confidence findings.">
                    <SelectInput
                      name="settings[security_scan_min_confidence]"
                      value={secScanMinConf}
                      onValueChange={setSecScanMinConf}
                      className="w-[160px]"
                      options={[
                        { value: "0", label: "High only" },
                        { value: "1", label: "High + Medium" },
                        { value: "2", label: "All (incl. Weak)" },
                      ]}
                    />
                  </FormField>
                </div>

                <FormField label="">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Form method="post" action={`${base}/settings/security_scan`} options={{ preserveScroll: true, onBefore: onSecScanSubmit, onSuccess: onSecScanSuccess, onError: onSecScanError }} className="inline">
                      {() => (
                        <Button type="submit" variant="outline" size="sm" disabled={secScanRunning}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          {secScanRunning ? "Starting..." : "Scan Now"}
                        </Button>
                      )}
                    </Form>
                    {secScanTriggered && <Badge variant="secondary">Scan queued</Badge>}
                    {settings.last_security_scan_at && (
                      <span className="text-sm text-muted-foreground">
                        Last scan: {timeAgo(settings.last_security_scan_at)}
                        {settings.last_security_scan_total_warnings && <> · {settings.last_security_scan_total_warnings} warning{settings.last_security_scan_total_warnings === "1" ? "" : "s"}</>}
                        {settings.last_security_scan_count && settings.last_security_scan_count !== "0" && <> · {settings.last_security_scan_count} new</>}
                      </span>
                    )}
                  </div>
                  {settings.last_security_scan_error && (
                    <p className="text-sm text-destructive">{settings.last_security_scan_error}</p>
                  )}
                  {!settings.last_security_scan_error && (
                    <p className="text-sm text-muted-foreground">Run a Brakeman scan immediately. AI fix suggestions require a Gemini API key.</p>
                  )}
                </FormField>
              </SectionCard>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={processing}>
                  {processing ? "Saving..." : "Save Settings"}
                </Button>
                {recentlySuccessful && <Badge variant="secondary">Saved</Badge>}
              </div>
            </>
          )}
        </Form>

        <PerformanceIssues issues={performance_issues} base={base} />
        <SecurityIssues issues={security_issues} base={base} />
      </div>
    </AppLayout>
  );
}

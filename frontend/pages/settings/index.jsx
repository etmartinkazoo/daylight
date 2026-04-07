import { useState } from "react";
import { useForm, router } from "@inertiajs/react";
import DaylightLayout from "../DaylightLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getNotificationSound, setNotificationSound, previewSound, soundOptions } from "@/lib/notification-sounds.js";
import { timeAgo } from "@/lib/formatters.js";
import PerformanceIssues from "./PerformanceIssues.jsx";
import SecurityIssues from "./SecurityIssues.jsx";

function FormField({ label, hint, children, htmlFor, saved, savedAt }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {htmlFor ? <Label htmlFor={htmlFor}>{label}</Label> : <span className="text-sm font-medium leading-none">{label}</span>}
        {saved && (
          <Badge variant="secondary" className="text-xs gap-1">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3.5 8.5l3 3 6-6"/></svg>
            Saved{savedAt && <> &middot; {timeAgo(savedAt)}</>}
          </Badge>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-5 flex flex-col gap-5">
        {children}
      </CardContent>
    </Card>
  );
}

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

  const { data, setData, patch, processing, recentlySuccessful } = useForm({
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

  const bulletTimeRemaining = (() => {
    if (!settings.bullet_diagnostic_active || !settings.bullet_diagnostic_expires_at) return null;
    const expires = new Date(settings.bullet_diagnostic_expires_at);
    return Math.max(0, Math.round((expires - new Date()) / 60000));
  })();

  function handleSubmit(e) {
    e.preventDefault();
    patch(`${base}/settings`, { preserveScroll: true });
  }

  function runCleanup() {
    setCleanupRunning(true); setCleanupDone(false);
    router.post(`${base}/settings/cleanup`, {}, {
      preserveScroll: true,
      onSuccess: () => { setCleanupRunning(false); setCleanupDone(true); },
      onError: () => setCleanupRunning(false),
    });
  }

  function sendTestNotification() {
    setTestNotifRunning(true); setTestNotifDone(false);
    router.post(`${base}/settings/test_notification`, {}, {
      preserveScroll: true,
      onSuccess: () => { setTestNotifRunning(false); setTestNotifDone(true); },
      onError: () => setTestNotifRunning(false),
    });
  }

  function runPerformanceScan() {
    setScanRunning(true); setScanTriggered(false);
    router.post(`${base}/settings/run_performance_scan`, {}, {
      preserveScroll: true,
      onSuccess: () => { setScanRunning(false); setScanTriggered(true); },
      onError: () => setScanRunning(false),
    });
  }

  function runSecurityScan() {
    setSecScanRunning(true); setSecScanTriggered(false);
    router.post(`${base}/settings/run_security_scan`, {}, {
      preserveScroll: true,
      onSuccess: () => { setSecScanRunning(false); setSecScanTriggered(true); },
      onError: () => setSecScanRunning(false),
    });
  }

  function startBulletDiagnostic() {
    setBulletStarting(true);
    router.post(`${base}/settings/toggle_bullet_diagnostic`, { duration: bulletDuration }, {
      preserveScroll: true,
      onFinish: () => setBulletStarting(false),
    });
  }

  function stopBulletDiagnostic() {
    router.post(`${base}/settings/stop_bullet_diagnostic`, {}, { preserveScroll: true });
  }

  const f = (key) => data[`settings[${key}]`];
  const sf = (key) => (v) => setData(`settings[${key}]`, v);
  const sfE = (key) => (e) => setData(`settings[${key}]`, e.target.value);

  return (
    <DaylightLayout>
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure Daylight monitoring and notifications</p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>

          {/* Source Code */}
          <SectionCard title="Source Code" description="Connect a GitHub repo so AI can reference your code when diagnosing errors.">
            <FormField label="GitHub Repo URL" htmlFor="github_repo_url" hint="Full URL to your GitHub repository.">
              <Input id="github_repo_url" type="url" placeholder="https://github.com/org/repo"
                value={f("github_repo_url")} onChange={sfE("github_repo_url")} />
            </FormField>
            <FormField label="Default Branch" htmlFor="github_default_branch">
              <Input id="github_default_branch" placeholder="main" className="max-w-[180px]"
                value={f("github_default_branch")} onChange={sfE("github_default_branch")} />
            </FormField>
          </SectionCard>

          {/* Notifications */}
          <SectionCard title="Notifications" description="Get notified when new errors occur or existing ones recur.">
            <FormField label="Email Recipients" htmlFor="notification_emails" hint="Comma-separated email addresses to notify on new/recurring errors.">
              <Input id="notification_emails" placeholder="dev@example.com, ops@example.com"
                value={f("notification_emails")} onChange={sfE("notification_emails")} />
            </FormField>
            <FormField label="Slack Webhook URL" htmlFor="slack_webhook_url" hint="Incoming webhook URL for Slack notifications.">
              <Input id="slack_webhook_url" type="url" placeholder="https://hooks.slack.com/services/..."
                value={f("slack_webhook_url")} onChange={sfE("slack_webhook_url")} />
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
                <Button type="button" variant="outline" size="sm" disabled={testNotifRunning} onClick={sendTestNotification}>
                  {testNotifRunning ? "Sending..." : "Send Test Notification"}
                </Button>
                {testNotifDone && <Badge variant="secondary">Test notification sent</Badge>}
              </div>
            </FormField>
          </SectionCard>

          {/* Thresholds */}
          <SectionCard title="Thresholds" description="Control what gets tracked.">
            <div className="grid grid-cols-2 gap-5">
              <FormField label="Slow Request Threshold" htmlFor="slow_request_threshold_ms" hint="Requests slower than this appear on the Requests page.">
                <div className="flex items-center max-w-[200px]">
                  <Input id="slow_request_threshold_ms" type="number" className="rounded-r-none border-r-0"
                    value={f("slow_request_threshold_ms")} onChange={sfE("slow_request_threshold_ms")} />
                  <span className="flex h-9 items-center px-3 rounded-r-md border border-input bg-muted text-sm text-muted-foreground shrink-0">ms</span>
                </div>
              </FormField>
              <FormField label="Slow Query Threshold" htmlFor="slow_query_threshold_ms" hint="SQL queries slower than this are recorded.">
                <div className="flex items-center max-w-[200px]">
                  <Input id="slow_query_threshold_ms" type="number" className="rounded-r-none border-r-0"
                    value={f("slow_query_threshold_ms")} onChange={sfE("slow_query_threshold_ms")} />
                  <span className="flex h-9 items-center px-3 rounded-r-md border border-input bg-muted text-sm text-muted-foreground shrink-0">ms</span>
                </div>
              </FormField>
            </div>
            <FormField label="Data Retention" htmlFor="retention_days" hint="Occurrences, requests, queries, and job records older than this are purged.">
              <div className="flex items-center max-w-[200px]">
                <Input id="retention_days" type="number" className="rounded-r-none border-r-0"
                  value={f("retention_days")} onChange={sfE("retention_days")} />
                <span className="flex h-9 items-center px-3 rounded-r-md border border-input bg-muted text-sm text-muted-foreground shrink-0">days</span>
              </div>
            </FormField>
            <FormField label="" hint="Immediately purge data older than the retention period.">
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={cleanupRunning} onClick={runCleanup}>
                  {cleanupRunning ? "Running..." : "Run Cleanup Now"}
                </Button>
                {cleanupDone && <Badge variant="secondary">Cleanup complete</Badge>}
              </div>
            </FormField>
          </SectionCard>

          {/* Sampling */}
          <SectionCard title="Sampling" description="Control how much data Daylight captures. Exceptions are always captured at 100%.">
            <FormField label="Global Sample Rate" htmlFor="sample_rate" hint="1.0 = capture everything, 0.5 = capture 50% of requests. Exceptions are always captured regardless of this setting.">
              <div className="flex items-center max-w-[200px]">
                <Input id="sample_rate" type="number" step="0.1" min="0" max="1" className="rounded-r-none border-r-0"
                  value={f("sample_rate")} onChange={sfE("sample_rate")} />
                <span className="flex h-9 items-center px-3 rounded-r-md border border-input bg-muted text-sm text-muted-foreground shrink-0">0–1</span>
              </div>
            </FormField>
          </SectionCard>

          {/* AI */}
          <SectionCard title="AI" description="Configure the AI assistant for the sheet AI tab.">
            <FormField
              label="Gemini API Key" htmlFor="gemini_api_key"
              saved={!!settings.gemini_api_key} savedAt={settings.gemini_api_key_saved_at}
              hint={<>Get a key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="underline underline-offset-2">Google AI Studio</a>. Enables Gemini Flash and Pro models.</>}
            >
              <Input id="gemini_api_key" type="password"
                placeholder={settings.gemini_api_key ? "Key saved — leave blank to keep" : "Enter API key"}
                value={f("gemini_api_key")} onChange={sfE("gemini_api_key")} autoComplete="off" />
            </FormField>

            <FormField
              label="Anthropic API Key" htmlFor="anthropic_api_key"
              saved={!!settings.anthropic_api_key} savedAt={settings.anthropic_api_key_saved_at}
              hint={<>Get a key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" className="underline underline-offset-2">Anthropic Console</a>. Enables Claude Haiku, Sonnet, and Opus models.</>}
            >
              <Input id="anthropic_api_key" type="password"
                placeholder={settings.anthropic_api_key ? "Key saved — leave blank to keep" : "sk-ant-..."}
                value={f("anthropic_api_key")} onChange={sfE("anthropic_api_key")} autoComplete="off" />
            </FormField>

            <FormField label="Default Model" htmlFor="default_ai_model" hint="Default model for all AI features: scanners, solutions, and chat. Can be overridden per chat.">
              <Select value={f("default_ai_model")} onValueChange={sf("default_ai_model")}>
                <SelectTrigger id="default_ai_model" className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Gemini</SelectLabel>
                    <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                    <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Claude</SelectLabel>
                    <SelectItem value="claude-haiku-4-5-20251001">Claude Haiku</SelectItem>
                    <SelectItem value="claude-sonnet-4-6">Claude Sonnet</SelectItem>
                    <SelectItem value="claude-opus-4-6">Claude Opus</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Context Notes" htmlFor="ai_context_notes" hint="Describe your app's architecture, key patterns, or common pitfalls. This is prepended to every AI conversation.">
              <Textarea id="ai_context_notes" rows={5}
                placeholder="e.g. This app uses multi-tenant SQLite via activerecord-tenanted. The main models are Partner, Project, Todo, Service..."
                value={f("ai_context_notes")} onChange={sfE("ai_context_notes")} />
            </FormField>

            <FormField
              label="GitHub API Token" htmlFor="github_api_token"
              saved={!!settings.github_api_token} savedAt={settings.github_api_token_saved_at}
              hint={<>Personal access token with <code className="text-xs bg-muted px-1 rounded">repo</code> scope. Required for Solutions to push PRs to GitHub.</>}
            >
              <Input id="github_api_token" type="password"
                placeholder={settings.github_api_token ? "Token saved — leave blank to keep" : "ghp_..."}
                value={f("github_api_token")} onChange={sfE("github_api_token")} autoComplete="off" />
            </FormField>

            <FormField label="Auto-Generate Solutions" htmlFor="solutions_scan_enabled" hint="Automatically generate AI fix proposals for open performance and security issues once per day.">
              <Select value={f("solutions_scan_enabled")} onValueChange={sf("solutions_scan_enabled")}>
                <SelectTrigger id="solutions_scan_enabled" className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled (daily)</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </SectionCard>

          {/* Performance Scanning */}
          <SectionCard title="Performance Scanning" description="Automatically detect N+1 queries, slow query patterns, and counter cache opportunities.">
            <div className="grid grid-cols-2 gap-5">
              <FormField label="Auto Scan" htmlFor="performance_scan_enabled" hint="Automatically scan for performance issues on a schedule.">
                <Select value={f("performance_scan_enabled")} onValueChange={sf("performance_scan_enabled")}>
                  <SelectTrigger id="performance_scan_enabled" className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Scan Interval" htmlFor="performance_scan_interval" hint="How often to run the performance scan.">
                <Select value={f("performance_scan_interval")} onValueChange={sf("performance_scan_interval")}>
                  <SelectTrigger id="performance_scan_interval" className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Every hour</SelectItem>
                    <SelectItem value="6h">Every 6 hours</SelectItem>
                    <SelectItem value="12h">Every 12 hours</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="" hint="Run a performance scan immediately. Analyzes the last 24h of query data. AI solutions require a Gemini API key.">
              <div className="flex items-center gap-2 flex-wrap">
                <Button type="button" variant="outline" size="sm" disabled={scanRunning} onClick={runPerformanceScan}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  {scanRunning ? "Starting..." : "Scan Now"}
                </Button>
                {scanTriggered && <Badge variant="secondary">Scan queued</Badge>}
                {settings.last_performance_scan_at && (
                  <span className="text-xs text-muted-foreground">
                    Last scan: {timeAgo(settings.last_performance_scan_at)}
                    {settings.last_performance_scan_count && <> · {settings.last_performance_scan_count} issue{settings.last_performance_scan_count === "1" ? "" : "s"} found</>}
                  </span>
                )}
              </div>
            </FormField>

            <FormField label="Live N+1 Detection (Bullet)" hint="Enable Bullet live detection in production for a limited window. Instruments 5% of requests to detect N+1 queries, unused eager loads, and counter cache opportunities. Always active in development.">
              {settings.bullet_diagnostic_active ? (
                <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2">
                  <span className="size-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                  <span className="text-sm text-green-700 dark:text-green-400 flex-1">Live detection active — {bulletTimeRemaining}min remaining</span>
                  <Button type="button" variant="outline" size="sm" onClick={stopBulletDiagnostic}>Stop</Button>
                </div>
              ) : (
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
                  <Button type="button" variant="outline" size="sm" disabled={bulletStarting} onClick={startBulletDiagnostic}>
                    {bulletStarting ? "Starting..." : "Start Diagnostic"}
                  </Button>
                </div>
              )}
            </FormField>
          </SectionCard>

          {/* Security Scanning */}
          <SectionCard title="Security Scanning" description="Run Brakeman static analysis to detect SQL injection, XSS, CSRF, and other security vulnerabilities.">
            <div className="grid grid-cols-3 gap-5">
              <FormField label="Auto Scan" htmlFor="security_scan_enabled" hint="Automatically run Brakeman security scans on a schedule.">
                <Select value={f("security_scan_enabled")} onValueChange={sf("security_scan_enabled")}>
                  <SelectTrigger id="security_scan_enabled" className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Scan Interval" htmlFor="security_scan_interval">
                <Select value={f("security_scan_interval")} onValueChange={sf("security_scan_interval")}>
                  <SelectTrigger id="security_scan_interval" className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6h">Every 6 hours</SelectItem>
                    <SelectItem value="12h">Every 12 hours</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Min Confidence" htmlFor="security_scan_min_confidence" hint="Filter out low-confidence findings.">
                <Select value={f("security_scan_min_confidence")} onValueChange={sf("security_scan_min_confidence")}>
                  <SelectTrigger id="security_scan_min_confidence" className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">High only</SelectItem>
                    <SelectItem value="1">High + Medium</SelectItem>
                    <SelectItem value="2">All (incl. Weak)</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="">
              <div className="flex items-center gap-2 flex-wrap">
                <Button type="button" variant="outline" size="sm" disabled={secScanRunning} onClick={runSecurityScan}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  {secScanRunning ? "Starting..." : "Scan Now"}
                </Button>
                {secScanTriggered && <Badge variant="secondary">Scan queued</Badge>}
                {settings.last_security_scan_at && (
                  <span className="text-xs text-muted-foreground">
                    Last scan: {timeAgo(settings.last_security_scan_at)}
                    {settings.last_security_scan_total_warnings && <> · {settings.last_security_scan_total_warnings} warning{settings.last_security_scan_total_warnings === "1" ? "" : "s"}</>}
                    {settings.last_security_scan_count && settings.last_security_scan_count !== "0" && <> · {settings.last_security_scan_count} new</>}
                  </span>
                )}
              </div>
              {settings.last_security_scan_error && (
                <p className="text-xs text-destructive">{settings.last_security_scan_error}</p>
              )}
              {!settings.last_security_scan_error && (
                <p className="text-xs text-muted-foreground">Run a Brakeman scan immediately. AI fix suggestions require a Gemini API key.</p>
              )}
            </FormField>
          </SectionCard>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={processing}>
              {processing ? "Saving..." : "Save Settings"}
            </Button>
            {recentlySuccessful && <Badge variant="secondary">Saved</Badge>}
          </div>
        </form>

        <PerformanceIssues issues={performance_issues} base={base} />
        <SecurityIssues issues={security_issues} base={base} />
      </div>
    </DaylightLayout>
  );
}

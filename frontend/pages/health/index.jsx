import { useState } from "react";
import { cn } from "@/lib/utils";
import DaylightLayout from "../DaylightLayout";
import EwSheet from "../errors/EwSheet";
import { DonutChart } from "@/components/charts/DonutChart";
import { AreaChart } from "@/components/charts/AreaChart";
import { formatTimeLong } from "@/lib/formatters.js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function SheetRow({ label, children, className }) {
  return (
    <div className={cn("flex items-center justify-between py-3 text-sm", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

export default function HealthIndex({
  system = {}, database = {}, jobs = {}, errors = {}, apdex = null,
  error_sparkline = [], request_sparkline = [], base_path: base = "/daylight",
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetData, setSheetData] = useState(null);

  function openFailure(f) {
    setSheetTitle(f.job_class || "Job Failure");
    setSheetData(f);
    setSheetOpen(true);
  }

  const apdexColor = apdex == null ? "#64748b" : apdex >= 0.9 ? "#22c55e" : apdex >= 0.7 ? "#f59e0b" : "#ef4444";
  const errorChartSegments = [
    { value: errors.open ?? 0, color: "#ef4444", label: "Open" },
    { value: Math.max((errors.total ?? 0) - (errors.open ?? 0), 0), color: "#22c55e", label: "Resolved" },
  ];

  return (
    <DaylightLayout>
      <div className="flex flex-col gap-6 p-6">

        {/* Page header */}
        <div>
          <h1 className="text-xl font-semibold">Health Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">System monitoring and performance overview</p>
        </div>

        {/* System Info */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">System Info</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card>
              <CardHeader><CardDescription>Environment</CardDescription></CardHeader>
              <CardContent>
                <Badge variant={system.environment === "production" ? "destructive" : "secondary"}>
                  {system.environment || "—"}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardDescription>Ruby Version</CardDescription></CardHeader>
              <CardContent><p className="font-mono text-sm">{system.ruby_version || "—"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardDescription>Rails Version</CardDescription></CardHeader>
              <CardContent><p className="font-mono text-sm">{system.rails_version || "—"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardDescription>Uptime</CardDescription></CardHeader>
              <CardContent><p className="text-sm">{system.uptime || "—"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardDescription>Memory Usage</CardDescription></CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {system.memory_mb || "—"}
                  {system.memory_mb && <span className="text-sm font-normal text-muted-foreground"> MB</span>}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardDescription>Process ID</CardDescription></CardHeader>
              <CardContent><p className="font-mono text-sm">{system.pid || "—"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardDescription>Server Time</CardDescription></CardHeader>
              <CardContent><p className="text-sm">{formatTimeLong(system.server_time) || "—"}</p></CardContent>
            </Card>
          </div>
        </div>

        {/* Database Status */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Database Status</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card>
              <CardHeader><CardDescription>Connection</CardDescription></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <span className={cn("size-2 rounded-full", database.connected ? "bg-green-500" : "bg-red-500")} />
                  {database.connected ? "Connected" : "Disconnected"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardDescription>Adapter</CardDescription></CardHeader>
              <CardContent><p className="font-mono text-sm">{database.adapter || "—"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardDescription>Tables</CardDescription></CardHeader>
              <CardContent><p className="text-2xl font-semibold tabular-nums">{database.tables ?? "—"}</p></CardContent>
            </Card>
            {database.size_mb != null && (
              <Card>
                <CardHeader><CardDescription>App DB Size</CardDescription></CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">
                    {database.size_mb}
                    <span className="text-sm font-normal text-muted-foreground"> MB</span>
                  </p>
                </CardContent>
              </Card>
            )}
            {database.errorwatch_size_mb != null && (
              <Card>
                <CardHeader><CardDescription>Daylight DB Size</CardDescription></CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums">
                    {database.errorwatch_size_mb}
                    <span className="text-sm font-normal text-muted-foreground"> MB</span>
                  </p>
                </CardContent>
              </Card>
            )}
            {database.error && (
              <Card className="border-red-200">
                <CardHeader><CardDescription>Error</CardDescription></CardHeader>
                <CardContent><p className="text-sm text-red-500">{database.error}</p></CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Performance Overview */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Performance Overview</h2>

          {apdex != null && (
            <Card style={{ borderColor: `${apdexColor}30` }}>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Apdex Score</span>
                  <span className="text-3xl font-bold tabular-nums" style={{ color: apdexColor }}>{apdex.toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground">
                    {apdex >= 0.9 ? "Excellent" : apdex >= 0.7 ? "Fair" : "Poor"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Errors section */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">Errors</h3>
            <div className="flex flex-wrap gap-4">
              <Card className="flex-none">
                <CardHeader><CardDescription>Error Distribution</CardDescription></CardHeader>
                <CardContent>
                  <DonutChart segments={errorChartSegments} size={140} strokeWidth={16} centerValue={String(errors.total ?? 0)} centerLabel="total" />
                </CardContent>
              </Card>
              <div className="grid flex-1 grid-cols-2 gap-3">
                <Card className={cn(errors.open > 0 && "border-red-200")}>
                  <CardHeader><CardDescription>Open Errors</CardDescription></CardHeader>
                  <CardContent className="flex flex-col gap-1">
                    <p className={cn("text-2xl font-semibold tabular-nums", errors.open > 0 && "text-red-500")}>{errors.open ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Currently unresolved</p>
                    {error_sparkline.length >= 2 && (
                      <div className="mt-1"><AreaChart data={error_sparkline} width={120} height={32} color="#ef4444" /></div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardDescription>Last 24 Hours</CardDescription></CardHeader>
                  <CardContent className="flex flex-col gap-1">
                    <p className="text-2xl font-semibold tabular-nums">{errors.last_24h ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Errors in past day</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardDescription>Last 7 Days</CardDescription></CardHeader>
                  <CardContent className="flex flex-col gap-1">
                    <p className="text-2xl font-semibold tabular-nums">{errors.last_7d ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Errors in past week</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardDescription>Total Errors</CardDescription></CardHeader>
                  <CardContent className="flex flex-col gap-1">
                    <p className="text-2xl font-semibold tabular-nums">{errors.total ?? 0}</p>
                    <p className="text-xs text-muted-foreground">All time</p>
                  </CardContent>
                </Card>
              </div>
            </div>
            {errors.open > 0 && (
              <a href={`${base}/errors`} className="text-sm text-primary hover:underline">View open errors →</a>
            )}
          </div>

          {/* Background Jobs */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">Background Jobs</h3>
            {!jobs.available ? (
              <Card>
                <CardContent className="pt-4 text-sm text-muted-foreground">Solid Queue not detected</CardContent>
              </Card>
            ) : jobs.error ? (
              <Card className="border-red-200">
                <CardContent className="pt-4 text-sm text-red-500">{jobs.error}</CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <Card>
                    <CardHeader><CardDescription>Ready</CardDescription></CardHeader>
                    <CardContent className="flex flex-col gap-1">
                      <p className="text-2xl font-semibold tabular-nums">{jobs.ready ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Queued for processing</p>
                      {request_sparkline.length >= 2 && (
                        <div className="mt-1"><AreaChart data={request_sparkline} width={120} height={32} color="#3b82f6" /></div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardDescription>Scheduled</CardDescription></CardHeader>
                    <CardContent className="flex flex-col gap-1">
                      <p className="text-2xl font-semibold tabular-nums">{jobs.scheduled ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Waiting to run</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardDescription>Running</CardDescription></CardHeader>
                    <CardContent className="flex flex-col gap-1">
                      <p className="text-2xl font-semibold tabular-nums">{jobs.claimed ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Currently executing</p>
                    </CardContent>
                  </Card>
                  <Card className={cn(jobs.failed > 0 && "border-red-200")}>
                    <CardHeader><CardDescription>Failed</CardDescription></CardHeader>
                    <CardContent className="flex flex-col gap-1">
                      <p className={cn("text-2xl font-semibold tabular-nums", jobs.failed > 0 && "text-red-500")}>{jobs.failed ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Requires attention</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardDescription>Processes</CardDescription></CardHeader>
                    <CardContent className="flex flex-col gap-1">
                      <p className="text-2xl font-semibold tabular-nums">{jobs.processes ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Active workers</p>
                    </CardContent>
                  </Card>
                </div>

                {jobs.recent_failures?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Recent Failures</CardTitle>
                    </CardHeader>
                    <Separator />
                    <div className="flex flex-col">
                      {jobs.recent_failures.map((f) => (
                        <Button key={f.id} variant="ghost" className="h-auto w-full justify-start rounded-none px-4 py-3 text-left" onClick={() => openFailure(f)}>
                          <div className="flex w-full flex-col gap-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{f.job_class || "Unknown"}</span>
                              <span className="text-xs text-muted-foreground">{formatTimeLong(f.failed_at)}</span>
                            </div>
                            <span className="text-xs text-red-500">{f.error_class}: {f.error_message}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={sheetTitle}>
        {sheetData && (
          <div className="flex flex-col divide-y p-4">
            <SheetRow label="Job Class">{sheetData.job_class}</SheetRow>
            <SheetRow label="Error Class"><span className="text-red-500">{sheetData.error_class}</span></SheetRow>
            <SheetRow label="Failed At">{formatTimeLong(sheetData.failed_at)}</SheetRow>
            {sheetData.error_message && (
              <div className="pt-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Error Message</p>
                <pre className="overflow-auto rounded-md bg-muted p-3 text-xs font-mono">{sheetData.error_message}</pre>
              </div>
            )}
          </div>
        )}
      </EwSheet>
    </DaylightLayout>
  );
}

import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import DaylightLayout from "../DaylightLayout";
import PeriodSelect from "../PeriodSelect";
import EwSheet from "../errors/EwSheet";
import { AreaChart } from "@/components/charts/AreaChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { timeAgo } from "@/lib/formatters.js";

function levelVariant(l) {
  if (l === "error" || l === "fatal") return "destructive";
  if (l === "warn") return "secondary";
  return "outline";
}

export default function LogsIndex({
  logs = [], counts = {}, period = "24h", level = null, total_logs = 0,
  volume_series = [], base_path: base = "/daylight",
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState(null);

  const warnCount = counts.warn || 0;
  const errorCount = counts.error || 0;
  const fatalCount = counts.fatal || 0;

  const tabs = [
    { label: "All", value: null, count: total_logs },
    { label: "Warn", value: "warn", count: warnCount },
    { label: "Error", value: "error", count: errorCount },
    { label: "Fatal", value: "fatal", count: fatalCount },
  ];

  function changePeriod(p) { router.get(`${base}/logs`, { period: p, level }, { preserveState: true }); }
  function changeLevel(l) { router.get(`${base}/logs`, { period, level: l }, { preserveState: true }); }
  function openLog(log) { setSheetItem(log); setSheetOpen(true); }

  const sheetAi = sheetItem
    ? `Log Entry:\nLevel: ${sheetItem.level}\nMessage: ${sheetItem.message}\nController: ${sheetItem.controller || "N/A"}\nPath: ${sheetItem.path || "N/A"}\nTime: ${sheetItem.occurred_at || "N/A"}`
    : "";

  return (
    <DaylightLayout>
      <div className="flex flex-col gap-6 p-6">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">Logs</h1>
            <p className="text-sm text-muted-foreground">Application log entries in the last {period}</p>
          </div>
          <PeriodSelect value={period} onChange={changePeriod} />
        </div>

        {/* Level filter tabs */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <Button
              key={tab.label}
              variant={level === tab.value ? "default" : "ghost"}
              size="sm"
              onClick={() => changeLevel(tab.value)}
            >
              {tab.label}
              {tab.count > 0 && (
                <Badge variant={level === tab.value ? "secondary" : "outline"} className="ml-1.5 text-xs">
                  {tab.count.toLocaleString()}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader><CardDescription>Total Logs</CardDescription></CardHeader>
            <CardContent><p className="text-2xl font-semibold tabular-nums">{total_logs.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardDescription>Warn</CardDescription></CardHeader>
            <CardContent><p className={cn("text-2xl font-semibold tabular-nums", warnCount > 0 && "text-yellow-500")}>{warnCount.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardDescription>Error</CardDescription></CardHeader>
            <CardContent><p className={cn("text-2xl font-semibold tabular-nums", errorCount > 0 && "text-red-500")}>{errorCount.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardDescription>Fatal</CardDescription></CardHeader>
            <CardContent><p className={cn("text-2xl font-semibold tabular-nums", fatalCount > 0 && "text-red-700")}>{fatalCount.toLocaleString()}</p></CardContent>
          </Card>
        </div>

        {volume_series.length >= 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Log Volume</CardTitle>
              <CardDescription>Over time</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <AreaChart data={volume_series} width={700} height={80} color="#6366f1" />
            </CardContent>
          </Card>
        )}

        {/* Log entries table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Log Entries</CardTitle>
            <CardDescription>{logs.length} entries</CardDescription>
          </CardHeader>
          <Separator />
          {logs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <span>No log entries recorded in this period.</span>
            </div>
          ) : (
            <InfiniteScroll data="logs" itemsElement="#logs-tbody" startElement="#logs-thead">
              <Table>
                <TableHeader id="logs-thead">
                  <TableRow>
                    <TableHead className="w-20">Level</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-40">Controller</TableHead>
                    <TableHead className="w-40">Path</TableHead>
                    <TableHead className="w-20 text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody id="logs-tbody">
                  {logs.map((log) => (
                    <TableRow
                      key={log.id || `${log.message}${log.occurred_at}`}
                      className="cursor-pointer"
                      onClick={() => openLog(log)}
                    >
                      <TableCell><Badge variant={levelVariant(log.level)}>{log.level}</Badge></TableCell>
                      <TableCell className="max-w-0 truncate text-sm">{log.message}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{log.controller_action || "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{log.request_path || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{timeAgo(log.occurred_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </InfiniteScroll>
          )}
        </Card>
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Log Detail" aiContext={sheetAi}>
        {sheetItem && (
          <div className="flex flex-col divide-y p-4">
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted-foreground">Level</span>
              <Badge variant={levelVariant(sheetItem.level)}>{sheetItem.level}</Badge>
            </div>
            {sheetItem.controller_action && (
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-muted-foreground">Controller</span>
                <span>{sheetItem.controller_action}</span>
              </div>
            )}
            {sheetItem.request_path && (
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-muted-foreground">Path</span>
                <span className="font-mono text-xs">{sheetItem.request_path}</span>
              </div>
            )}
            {sheetItem.occurred_at && (
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-muted-foreground">Time</span>
                <span>{new Date(sheetItem.occurred_at).toLocaleString()}</span>
              </div>
            )}
            <div className="pt-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Message</p>
              <pre className="overflow-auto rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap">{sheetItem.message}</pre>
            </div>
          </div>
        )}
      </EwSheet>
    </DaylightLayout>
  );
}

import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import DaylightLayout from "../DaylightLayout";
import PeriodSelect from "../PeriodSelect";
import EwSheet from "../errors/EwSheet";
import { AreaChart } from "@/components/charts/AreaChart";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { fmt, timeAgo, statusCodeClass } from "@/lib/formatters.js";

export default function HttpRequestsIndex({
  hosts = [], host_requests = [], selected_host = null,
  period = "24h", total_requests = 0, volume_series = [],
  base_path: base = "/daylight", sort_column = null, sort_direction = null,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState(null);

  const uniqueHosts = hosts.length;
  const avgDuration = hosts.length > 0 ? hosts.reduce((s, h) => s + (h.avg_duration || 0), 0) / hosts.length : 0;
  const totalErrors = hosts.reduce((s, h) => s + (h.error_count || 0), 0);
  const errorRate = total_requests > 0 ? ((totalErrors / total_requests) * 100).toFixed(1) : "0.0";

  const sheetAi = sheetItem
    ? `Outgoing HTTP Request:\nURL: ${sheetItem.url}\nStatus: ${sheetItem.status_code}\nDuration: ${fmt(sheetItem.duration_ms)}\nMethod: ${sheetItem.method || "GET"}\nTime: ${sheetItem.occurred_at || "N/A"}`
    : "";

  function changePeriod(p) { router.get(`${base}/http_requests`, { period: p }, { preserveState: true }); }
  function selectHost(host) { router.get(`${base}/http_requests`, { period, host: host.host }, { preserveState: true }); }
  function goBack() { router.get(`${base}/http_requests`, { period }, { preserveState: true }); }
  function openRequest(req) { setSheetItem(req); setSheetOpen(true); }

  function statusBadgeVariant(code) {
    const cls = statusCodeClass(code);
    if (cls === "ok") return "default";
    if (cls === "error") return "destructive";
    if (cls === "warn") return "secondary";
    return "outline";
  }

  return (
    <DaylightLayout>
      <div className="flex flex-col gap-6 p-6">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">Outgoing HTTP</h1>
            <p className="text-sm text-muted-foreground">{total_requests.toLocaleString()} requests in the last {period}</p>
          </div>
          <PeriodSelect value={period} onChange={changePeriod} />
        </div>

        {selected_host && host_requests.length > 0 ? (
          <>
            <Button variant="ghost" size="sm" onClick={goBack} className="self-start">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              All hosts
            </Button>
            <div className="flex items-center gap-3">
              <h2 className="font-medium">{selected_host}</h2>
              <span className="text-sm text-muted-foreground">{host_requests.length} requests</span>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className="w-24 text-right">Duration</TableHead>
                    <TableHead className="w-20 text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {host_requests.map((req) => (
                    <TableRow key={req.id || `${req.url}${req.occurred_at}`} className="cursor-pointer" onClick={() => openRequest(req)}>
                      <TableCell><Badge variant={statusBadgeVariant(req.status_code)}>{req.status_code}</Badge></TableCell>
                      <TableCell className="max-w-0 truncate font-mono text-xs">{req.url}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", req.duration_ms > 2000 && "text-red-500")}>{fmt(req.duration_ms)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{timeAgo(req.occurred_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardHeader><CardDescription>Total Requests</CardDescription></CardHeader>
                <CardContent><p className="text-2xl font-semibold tabular-nums">{total_requests.toLocaleString()}</p></CardContent>
              </Card>
              <Card>
                <CardHeader><CardDescription>Unique Hosts</CardDescription></CardHeader>
                <CardContent><p className="text-2xl font-semibold tabular-nums">{uniqueHosts.toLocaleString()}</p></CardContent>
              </Card>
              <Card>
                <CardHeader><CardDescription>Avg Duration</CardDescription></CardHeader>
                <CardContent><p className="text-2xl font-semibold tabular-nums">{fmt(avgDuration)}</p></CardContent>
              </Card>
              <Card>
                <CardHeader><CardDescription>Error Rate</CardDescription></CardHeader>
                <CardContent>
                  <p className={cn("text-2xl font-semibold tabular-nums", totalErrors > 0 && "text-red-500")}>{errorRate}%</p>
                </CardContent>
              </Card>
            </div>

            {volume_series.length >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Request Volume</CardTitle>
                  <CardDescription>Over time</CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <AreaChart data={volume_series} width={700} height={80} color="#3b82f6" />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Hosts</CardTitle>
                <CardDescription>{hosts.length} hosts</CardDescription>
              </CardHeader>
              <Separator />
              {hosts.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  <span>No outgoing HTTP requests recorded in this period.</span>
                </div>
              ) : (
                <InfiniteScroll data="hosts" itemsElement="#hosts-tbody" startElement="#hosts-thead">
                  <Table>
                    <TableHeader id="hosts-thead">
                      <TableRow>
                        <TableHead>Host</TableHead>
                        <TableHead className="w-20 text-right"><SortableHeader column="total" label="Requests" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                        <TableHead className="w-20 text-right"><SortableHeader column="avg_duration" label="Avg" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                        <TableHead className="w-20 text-right"><SortableHeader column="max_duration" label="Max" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                        <TableHead className="w-20 text-right">Errors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody id="hosts-tbody">
                      {hosts.map((host, i) => (
                        <TableRow key={`${host.host}:${i}`} className="cursor-pointer" onClick={() => selectHost(host)}>
                          <TableCell className="font-medium">{host.host}</TableCell>
                          <TableCell className="text-right tabular-nums">{host.total}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(host.avg_duration)}</TableCell>
                          <TableCell className={cn("text-right tabular-nums", host.max_duration > 5000 && "text-red-500")}>{fmt(host.max_duration)}</TableCell>
                          <TableCell className={cn("text-right tabular-nums", host.error_count > 0 && "text-red-500")}>{host.error_count || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </InfiniteScroll>
              )}
            </Card>
          </>
        )}
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="HTTP Request Detail" aiContext={sheetAi}>
        {sheetItem && (
          <div className="flex flex-col divide-y p-4">
            {sheetItem.method && (
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-muted-foreground">Method</span>
                <span>{sheetItem.method}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted-foreground">URL</span>
              <span className="font-mono text-xs">{sheetItem.url}</span>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusBadgeVariant(sheetItem.status_code)}>{sheetItem.status_code}</Badge>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className={cn(sheetItem.duration_ms > 2000 && "text-red-500")}>{fmt(sheetItem.duration_ms)}</span>
            </div>
            {sheetItem.occurred_at && (
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-muted-foreground">Time</span>
                <span>{new Date(sheetItem.occurred_at).toLocaleString()}</span>
              </div>
            )}
            {sheetItem.response_body && (
              <div className="pt-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Response</p>
                <pre className="overflow-auto rounded-md bg-muted p-3 text-xs font-mono">{sheetItem.response_body}</pre>
              </div>
            )}
          </div>
        )}
      </EwSheet>
    </DaylightLayout>
  );
}

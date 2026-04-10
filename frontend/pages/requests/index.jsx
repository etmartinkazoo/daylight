import { useState } from "react";
import { router, Link, InfiniteScroll } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import AppLayout from "@/layouts/app-layout";
import PeriodSelect from "@/components/PeriodSelect";
import EwSheet from "@/components/errors/EwSheet";
import { BarList } from "@/components/charts/BarList";
import { InteractiveBarChart } from "@/components/charts/InteractiveBarChart";
import { ExportButton } from "@/components/ui/export-button";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { fmt, timeAgo, formatTime, statusCodeClass, methodColor } from "@/lib/formatters.js";
import { DetailRow } from "@/components/ui/detail-row";
import { PageHeader } from "@/components/ui/page-header";

function levelVariant(l) {
  if (l === "error" || l === "fatal") return "destructive";
  if (l === "warn") return "secondary";
  return "outline";
}

export default function RequestsIndex({
  endpoints = [], route_requests = [], selected_request = null,
  selected_route = null, period = "24h", total_requests = 0,
  throughput_rpm = 0, apdex = null, latency_series = [], throughput_series = [], deploys = [],
  base_path: base = "/daylight", sort_column = null, sort_direction = null,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState(null);
  const [sheetType, setSheetType] = useState("endpoint");
const apdexColor = apdex == null ? "#64748b" : apdex >= 0.9 ? "#22c55e" : apdex >= 0.7 ? "#f59e0b" : "#ef4444";

  const statTotal = endpoints.reduce((s, ep) => s + (ep.total || 0), 0);
  const statAvg = statTotal === 0 ? 0
    : endpoints.reduce((s, ep) => s + (ep.avg_duration || 0) * (ep.total || 0), 0) / statTotal;
  const statErrors = endpoints.reduce((s, ep) => s + (ep.server_error_count || 0), 0);
  const statErrorRate = statTotal > 0 ? ((statErrors / statTotal) * 100).toFixed(1) : "0.0";
  const statP95 = endpoints.length > 0 ? Math.max(...endpoints.map((ep) => ep.p95_duration || 0)) : 0;

  const topEndpoints = endpoints
    .slice()
    .sort((a, b) => b.avg_duration - a.avg_duration)
    .slice(0, 5)
    .map((ep) => ({
      label: ep.route?.replace(/^(GET|POST|PATCH|PUT|DELETE)\s/, "") || ep.route,
      value: ep.avg_duration,
    }));

  const indexHref = `${base}/requests`;
  function selectEndpoint(ep) { router.get(indexHref, { period, route: ep.route }, { preserveState: true }); }

  function openRequest(req) {
    setSheetItem(req); setSheetType("request"); setSheetOpen(true);
    if (!req.queries) {
      router.get(`${base}/requests`, { period, route: selected_route, request_id: req.id }, {
        preserveState: true,
        only: ["selected_request"],
        onSuccess: (p) => {
          if (p.props.selected_request) setSheetItem(p.props.selected_request);
        },
      });
    }
  }

  function openEndpointSheet(ep) { setSheetItem(ep); setSheetType("endpoint"); setSheetOpen(true); }

  const sheetTitle = sheetType === "request"
    ? `${sheetItem?.method} ${sheetItem?.path}`
    : (sheetItem?.route || "");

  const sheetAi = (() => {
    if (!sheetItem) return "";
    if (sheetType === "endpoint") {
      return `Route: ${sheetItem.route}\nRequests: ${sheetItem.total}\nAvg: ${fmt(sheetItem.avg_duration)}\nP95: ${fmt(sheetItem.p95_duration)}\nMax: ${fmt(sheetItem.max_duration)}\n2xx: ${sheetItem.ok_count}, 4xx: ${sheetItem.client_error_count}, 5xx: ${sheetItem.server_error_count}`;
    }
    let ctx = `Request: ${sheetItem.method} ${sheetItem.path}\nStatus: ${sheetItem.status_code}\nDuration: ${fmt(sheetItem.duration_ms)}\nDB: ${fmt(sheetItem.db_duration_ms)}\nQueries: ${sheetItem.query_count}`;
    if (sheetItem.queries?.length) {
      ctx += `\n\nSlow queries during this request:\n${sheetItem.queries.map((q) => `${fmt(q.duration_ms)} ${q.sql}`).join("\n")}`;
    }
    return ctx;
  })();

  const chartData = latency_series.map((d, i) => ({
    t: d.t, latency: d.v, throughput: throughput_series[i]?.v || 0,
  }));

  function statusBadgeVariant(code) {
    const cls = statusCodeClass(code);
    if (cls === "ok") return "default";
    if (cls === "error") return "destructive";
    if (cls === "warn") return "secondary";
    return "outline";
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">

        <PageHeader
          title="Requests"
          description={`${total_requests.toLocaleString()} requests in the last ${period}`}
          actions={<><ExportButton baseUrl={`${base}/requests/export`} /><PeriodSelect value={period} href={indexHref} /></>}
        />

        {selected_route && route_requests.length > 0 ? (
          <>
            <Button variant="ghost" size="sm" className="self-start" asChild>
              <Link href={indexHref} data={{ period }} preserveState>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                All endpoints
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <h2 className="font-medium">{selected_route}</h2>
              <span className="text-sm text-muted-foreground">{route_requests.length} requests</span>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead className="w-24 text-right">Duration</TableHead>
                    <TableHead className="w-20 text-right">DB</TableHead>
                    <TableHead className="w-14 text-right">Qry</TableHead>
                    <TableHead className="w-24">IP</TableHead>
                    <TableHead className="w-20 text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {route_requests.map((req) => (
                    <TableRow key={req.id} className="cursor-pointer" onClick={() => openRequest(req)}>
                      <TableCell><Badge variant={statusBadgeVariant(req.status_code)}>{req.status_code}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{req.path}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", req.duration_ms > 500 && "text-yellow-500")}>{fmt(req.duration_ms)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(req.db_duration_ms)}</TableCell>
                      <TableCell className="text-right tabular-nums">{req.query_count}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{req.ip}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{timeAgo(req.occurred_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </>
        ) : (
          <>
            {/* Stats + bar list */}
            <div className="flex items-start gap-4">
              <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-3">
                <Card>
                  <CardHeader><CardDescription>Total Requests</CardDescription></CardHeader>
                  <CardContent><p className="text-2xl font-semibold tabular-nums">{statTotal.toLocaleString()}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardDescription>Avg Response Time</CardDescription></CardHeader>
                  <CardContent><p className="text-2xl font-semibold tabular-nums">{fmt(statAvg)}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardDescription>Error Rate (5xx)</CardDescription></CardHeader>
                  <CardContent><p className={cn("text-2xl font-semibold tabular-nums", statErrors > 0 && "text-red-500")}>{statErrorRate}%</p></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardDescription>P95 Response Time</CardDescription></CardHeader>
                  <CardContent><p className={cn("text-2xl font-semibold tabular-nums", statP95 > 500 && "text-yellow-500")}>{fmt(statP95)}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardDescription>Throughput</CardDescription></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold tabular-nums">
                      {throughput_rpm}
                      <span className="text-sm font-normal text-muted-foreground"> req/min</span>
                    </p>
                  </CardContent>
                </Card>
                {apdex != null && (
                  <Card>
                    <CardHeader><CardDescription>Apdex</CardDescription></CardHeader>
                    <CardContent><p className="text-2xl font-semibold tabular-nums" style={{ color: apdexColor }}>{apdex.toFixed(2)}</p></CardContent>
                  </Card>
                )}
              </div>
              {topEndpoints.length > 0 && (
                <Card className="w-72 flex-none">
                  <CardHeader><CardTitle className="text-sm">Slowest Endpoints</CardTitle></CardHeader>
                  <Separator />
                  <CardContent className="pt-4">
                    <BarList items={topEndpoints} valueFormatter={fmt} color="#6366f1" />
                  </CardContent>
                </Card>
              )}
            </div>

            {(latency_series.length > 0 || throughput_series.length > 0) && (
              <InteractiveBarChart
                data={chartData}
                series={[
                  { key: "latency", label: "Avg Latency (ms)", color: "#6366f1" },
                  { key: "throughput", label: "Throughput (req)", color: "#3b82f6" },
                ]}
                title="Request Performance"
                description="Response time and throughput over time"
                height={250}
                valueFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}`}
              />
            )}

            {/* Endpoints table */}
            {endpoints.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No request data yet</EmptyTitle>
                  <EmptyDescription>Requests are tracked automatically once your app starts serving traffic.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Card>
                <InfiniteScroll data="endpoints" itemsElement="#endpoints-tbody" startElement="#endpoints-thead">
                  <Table>
                    <TableHeader id="endpoints-thead">
                      <TableRow>
                        <TableHead>Route</TableHead>
                        <TableHead className="w-16 text-right"><SortableHeader column="total" label="Reqs" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                        <TableHead className="w-20 text-right"><SortableHeader column="avg_duration" label="Avg" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                        <TableHead className="w-20 text-right">P95</TableHead>
                        <TableHead className="w-20 text-right"><SortableHeader column="max_duration" label="Max" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                        <TableHead className="w-14 text-center"><SortableHeader column="ok_count" label="2xx" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                        <TableHead className="w-14 text-center"><SortableHeader column="client_error_count" label="4xx" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                        <TableHead className="w-14 text-center"><SortableHeader column="server_error_count" label="5xx" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody id="endpoints-tbody">
                      {endpoints.map((ep, i) => (
                        <TableRow key={`${ep.route}:${i}`} className="cursor-pointer" onClick={() => selectEndpoint(ep)}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="rounded px-1.5 py-0.5 text-sm font-semibold" style={{ background: `${methodColor(ep.method)}15`, color: methodColor(ep.method) }}>{ep.method}</span>
                              <span className="font-mono text-sm">{ep.route?.replace(/^(GET|POST|PATCH|PUT|DELETE)\s/, "") || ep.route}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{ep.total}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(ep.avg_duration)}</TableCell>
                          <TableCell className={cn("text-right tabular-nums", ep.p95_duration > 500 && "text-yellow-500")}>{fmt(ep.p95_duration)}</TableCell>
                          <TableCell className={cn("text-right tabular-nums", ep.max_duration > 1000 && "text-yellow-500")}>{fmt(ep.max_duration)}</TableCell>
                          <TableCell className="text-center tabular-nums">{ep.ok_count}</TableCell>
                          <TableCell className={cn("text-center tabular-nums", ep.client_error_count > 0 && "text-yellow-500")}>{ep.client_error_count}</TableCell>
                          <TableCell className={cn("text-center tabular-nums", ep.server_error_count > 0 && "text-red-500")}>{ep.server_error_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </InfiniteScroll>
              </Card>
            )}
          </>
        )}
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={sheetTitle} aiContext={sheetAi}>
        {sheetItem && (
          <div className="flex flex-col divide-y p-4">
            {sheetType === "endpoint" ? (
              <>
                <DetailRow label="Route" valueClassName="font-mono text-sm">{sheetItem.route}</DetailRow>
                <DetailRow label="Requests">{sheetItem.total}</DetailRow>
                <DetailRow label="Avg Duration">{fmt(sheetItem.avg_duration)}</DetailRow>
                <DetailRow label="P95 Duration" valueClassName={cn(sheetItem.p95_duration > 500 && "text-yellow-500")}>{fmt(sheetItem.p95_duration)}</DetailRow>
                <DetailRow label="Max Duration" valueClassName={cn(sheetItem.max_duration > 1000 && "text-yellow-500")}>{fmt(sheetItem.max_duration)}</DetailRow>
                <DetailRow label="Avg DB">{fmt(sheetItem.avg_db_duration)}</DetailRow>
                <DetailRow label="Avg Queries">{Math.round(sheetItem.avg_query_count)}</DetailRow>
                <DetailRow label="2xx">{sheetItem.ok_count}</DetailRow>
                <DetailRow label="4xx" valueClassName={cn(sheetItem.client_error_count > 0 && "text-yellow-500")}>{sheetItem.client_error_count}</DetailRow>
                <DetailRow label="5xx" valueClassName={cn(sheetItem.server_error_count > 0 && "text-red-500")}>{sheetItem.server_error_count}</DetailRow>
              </>
            ) : (
              <>
                <DetailRow label="Method">
                  <span className="rounded px-1.5 py-0.5 text-sm font-semibold" style={{ background: `${methodColor(sheetItem.method)}15`, color: methodColor(sheetItem.method) }}>{sheetItem.method}</span>
                </DetailRow>
                <DetailRow label="Path" valueClassName="font-mono text-sm">{sheetItem.path}</DetailRow>
                <DetailRow label="Controller">{sheetItem.controller_action}</DetailRow>
                <DetailRow label="Status"><Badge variant={statusBadgeVariant(sheetItem.status_code)}>{sheetItem.status_code}</Badge></DetailRow>
                <DetailRow label="Duration" valueClassName={cn(sheetItem.duration_ms > 500 && "text-yellow-500")}>{fmt(sheetItem.duration_ms)}</DetailRow>
                <DetailRow label="DB Time">{fmt(sheetItem.db_duration_ms)}</DetailRow>
                <DetailRow label="View Time">{fmt(sheetItem.view_duration_ms)}</DetailRow>
                <DetailRow label="Queries">{sheetItem.query_count}</DetailRow>
                <DetailRow label="IP" valueClassName="font-mono text-sm">{sheetItem.ip}</DetailRow>
                <DetailRow label="Time">{formatTime(sheetItem.occurred_at)}</DetailRow>

                {/* Waterfall / query timeline */}
                {sheetItem.waterfall?.length > 0 ? (
                  <div className="pt-3">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Request Timeline ({sheetItem.waterfall.length} events)</p>
                    <div className="flex flex-col gap-2">
                      {sheetItem.waterfall.map((evt, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                          <Badge variant="outline" className="shrink-0 text-sm">{evt.type}</Badge>
                          <div className="flex flex-1 flex-col gap-0.5">
                            <span className="font-mono">{evt.detail}</span>
                            {evt.duration_ms && (
                              <span className={cn("text-muted-foreground", evt.duration_ms > 100 && "text-yellow-500")}>{fmt(evt.duration_ms)}</span>
                            )}
                          </div>
                          {evt.status_code && <Badge variant={statusBadgeVariant(evt.status_code)}>{evt.status_code}</Badge>}
                          {evt.type === "cache" && <Badge variant={evt.hit ? "default" : "secondary"}>{evt.hit ? "HIT" : "MISS"}</Badge>}
                          {evt.type === "log" && <Badge variant={levelVariant(evt.level)}>{evt.level}</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : sheetItem.queries?.length > 0 ? (
                  <div className="pt-3">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Query Timeline ({sheetItem.queries.length})</p>
                    <div className="flex flex-col gap-2">
                      {sheetItem.queries.map((q) => (
                        <div key={q.id} className="flex flex-col gap-1 rounded-md bg-muted/50 p-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 rounded-full bg-primary/30" style={{ width: `${Math.max(Math.min((q.duration_ms / sheetItem.duration_ms) * 100, 100), 3)}%` }} />
                            <span className={cn("text-sm font-semibold tabular-nums", q.duration_ms > 100 && "text-yellow-500")}>{fmt(q.duration_ms)}</span>
                            <span className="text-sm text-muted-foreground">{q.source_location || ""}</span>
                          </div>
                          <pre className="overflow-auto text-sm font-mono text-muted-foreground">{q.sql}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : sheetItem.query_count > 0 ? (
                  <p className="py-3 text-sm text-muted-foreground">{sheetItem.query_count} queries ran but none exceeded the slow threshold.</p>
                ) : null}
              </>
            )}
          </div>
        )}
      </EwSheet>
    </AppLayout>
  );
}

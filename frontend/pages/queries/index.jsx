import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import DaylightLayout from "../DaylightLayout";
import PeriodSelect from "../PeriodSelect";
import EwSheet from "../errors/EwSheet";
import { BarList } from "@/components/charts/BarList";
import { InteractiveBarChart } from "@/components/charts/InteractiveBarChart";
import { ExportButton } from "@/components/ui/export-button";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { fmt, timeAgo } from "@/lib/formatters.js";

export default function QueriesIndex({
  queries = [], slowest = [], period = "24h", total_queries = 0,
  volume_series = [], n_plus_one_requests = [],
  base_path: base = "/daylight", sort_column = null, sort_direction = null,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState(null);

  const avgDuration = queries.length > 0
    ? queries.reduce((s, q) => s + (q.avg_duration || 0), 0) / queries.length
    : 0;
  const maxDuration = queries.length > 0
    ? Math.max(...queries.map((q) => q.max_duration || 0))
    : 0;

  const topQueries = queries
    .slice()
    .sort((a, b) => (b.avg_duration || 0) - (a.avg_duration || 0))
    .slice(0, 5)
    .map((q) => ({
      label: q.normalized_sql?.substring(0, 60) || "Unknown",
      value: q.avg_duration || 0,
    }));

  function changePeriod(p) { router.get(`${base}/queries`, { period: p }, { preserveState: true }); }
  function openQuery(q) { setSheetItem(q); setSheetOpen(true); }

  const sheetAiContext = sheetItem
    ? `SQL Query (slow):\n${sheetItem.sql || sheetItem.normalized_sql}\n\nDuration: ${fmt(sheetItem.duration_ms || sheetItem.avg_duration)}\nMax: ${fmt(sheetItem.max_duration || sheetItem.duration_ms)}\nSource: ${sheetItem.source_location || "unknown"}\nController: ${sheetItem.controller_action || "N/A"}\nPath: ${sheetItem.request_path || "N/A"}\nOccurrences: ${sheetItem.total || 1}`
    : "";

  return (
    <DaylightLayout>
      <div className="flex flex-col gap-6 p-6">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">Slow Queries</h1>
            <p className="text-sm text-muted-foreground">Queries exceeding 50ms threshold in the last {period}</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton baseUrl={`${base}/queries/export`} />
            <PeriodSelect value={period} onChange={changePeriod} />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader><CardDescription>Total Slow Queries</CardDescription></CardHeader>
            <CardContent><p className="text-2xl font-semibold tabular-nums">{total_queries.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardDescription>Unique Patterns</CardDescription></CardHeader>
            <CardContent><p className="text-2xl font-semibold tabular-nums">{queries.length.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardDescription>Avg Duration</CardDescription></CardHeader>
            <CardContent><p className="text-2xl font-semibold tabular-nums">{fmt(avgDuration)}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardDescription>Slowest Query</CardDescription></CardHeader>
            <CardContent><p className="text-2xl font-semibold tabular-nums text-red-500">{fmt(maxDuration)}</p></CardContent>
          </Card>
        </div>

        {volume_series.length > 0 && (
          <InteractiveBarChart
            data={volume_series.map((d) => ({ ...d, queries: d.v }))}
            series={[{ key: "queries", label: "Slow Queries", color: "#ef4444" }]}
            title="Query Volume"
            description="Slow queries over time"
            height={250}
          />
        )}

        {/* N+1 suspects */}
        {n_plus_one_requests.length > 0 && (
          <Card className="border-yellow-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <CardTitle className="text-sm text-yellow-600">N+1 Query Suspects</CardTitle>
              </div>
            </CardHeader>
            <Separator />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead>Controller</TableHead>
                  <TableHead className="w-24 text-right">Query Count</TableHead>
                  <TableHead className="w-20 text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {n_plus_one_requests.map((np, i) => (
                  <TableRow key={`${np.path}:${i}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-yellow-600 bg-yellow-50">N+1</Badge>
                        <span className="font-mono text-xs">{np.path}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{np.controller_action || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{np.query_count}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{timeAgo(np.occurred_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Top slowest patterns bar list */}
        {topQueries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Slowest Query Patterns</CardTitle>
              <CardDescription>Top 5 by average duration</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <BarList items={topQueries} color="#ef4444" valueFormatter={fmt} maxItems={5} />
            </CardContent>
          </Card>
        )}

        {/* Query Patterns table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Query Patterns</CardTitle>
            <CardDescription>{queries.length} unique patterns</CardDescription>
          </CardHeader>
          <Separator />
          {queries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
              <span>No slow queries recorded in this period.</span>
            </div>
          ) : (
            <InfiniteScroll data="queries" itemsElement="#queries-tbody" startElement="#queries-thead">
              <Table>
                <TableHeader id="queries-thead">
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead className="w-16 text-right"><SortableHeader column="total" label="Count" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                    <TableHead className="w-20 text-right"><SortableHeader column="avg_duration" label="Avg" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                    <TableHead className="w-20 text-right"><SortableHeader column="max_duration" label="Max" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                    <TableHead className="w-40">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody id="queries-tbody">
                  {queries.map((q, i) => (
                    <TableRow key={`${q.normalized_sql}:${i}`} className="cursor-pointer" onClick={() => openQuery(q)}>
                      <TableCell className="max-w-0 truncate font-mono text-xs">{q.normalized_sql}</TableCell>
                      <TableCell className="text-right tabular-nums">{q.total}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", q.avg_duration > 200 && "text-red-500")}>{fmt(q.avg_duration)}</TableCell>
                      <TableCell className={cn("text-right tabular-nums", q.max_duration > 500 && "text-red-500")}>{fmt(q.max_duration)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{q.source_location || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </InfiniteScroll>
          )}
        </Card>

        {/* Slowest individual queries */}
        {slowest.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Slowest Individual Queries</CardTitle>
              <CardDescription>Recent worst offenders</CardDescription>
            </CardHeader>
            <Separator />
            <div className="flex flex-col divide-y">
              {slowest.map((q) => (
                <Button key={q.id} variant="ghost" className="h-auto w-full justify-between rounded-none px-4 py-3" onClick={() => { setSheetItem(q); setSheetOpen(true); }}>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold tabular-nums text-red-500">{fmt(q.duration_ms)}</span>
                    <span className="font-mono text-xs text-muted-foreground">{q.source_location || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{q.controller_action}</span>
                    <span>{timeAgo(q.occurred_at)}</span>
                  </div>
                </Button>
              ))}
            </div>
          </Card>
        )}
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Query Detail" aiContext={sheetAiContext}>
        {sheetItem && (
          <div className="flex flex-col divide-y p-4">
            {sheetItem.controller_action && <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Controller</span><span>{sheetItem.controller_action}</span></div>}
            {sheetItem.request_path && <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Path</span><span className="font-mono text-xs">{sheetItem.request_path}</span></div>}
            {sheetItem.source_location && <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Source</span><span className="font-mono text-xs">{sheetItem.source_location}</span></div>}
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className={cn((sheetItem.duration_ms > 200 || sheetItem.avg_duration > 200) && "text-red-500")}>
                {fmt(sheetItem.duration_ms || sheetItem.avg_duration)}
              </span>
            </div>
            {sheetItem.max_duration && (
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-muted-foreground">Max</span>
                <span className={cn(sheetItem.max_duration > 500 && "text-red-500")}>{fmt(sheetItem.max_duration)}</span>
              </div>
            )}
            {sheetItem.total && <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Occurrences</span><span>{sheetItem.total}</span></div>}
            <div className="pt-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">SQL</p>
              <pre className="overflow-auto rounded-md bg-muted p-3 text-xs font-mono">{sheetItem.sql || sheetItem.normalized_sql}</pre>
            </div>
          </div>
        )}
      </EwSheet>
    </DaylightLayout>
  );
}

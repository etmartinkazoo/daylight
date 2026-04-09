import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import AppLayout from "@/layouts/app-layout";
import PeriodSelect from "@/components/PeriodSelect";
import EwSheet from "@/components/errors/EwSheet";
import { DonutChart } from "@/components/charts/DonutChart";
import { InteractiveBarChart } from "@/components/charts/InteractiveBarChart";
import { ExportButton } from "@/components/ui/export-button";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { fmt, timeAgo, formatTime } from "@/lib/formatters.js";
import { DetailRow } from "@/components/ui/detail-row";
import { PageHeader } from "@/components/ui/page-header";

export default function JobsIndex({
  job_classes = [], failures = [], period = "24h", totals = {}, solid_queue = null,
  volume_series = [], failure_series = [],
  base_path: base = "/daylight", sort_column = null, sort_direction = null,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState(null);
  const [sheetType, setSheetType] = useState("class");

  const avgDuration = job_classes.length > 0
    ? job_classes.reduce((s, j) => s + (j.avg_duration || 0), 0) / job_classes.length
    : 0;

  const donutSegments = [
    { value: totals.completed || 0, color: "#22c55e", label: "Completed" },
    { value: totals.failed || 0, color: "#ef4444", label: "Failed" },
    { value: (totals.total || 0) - (totals.completed || 0) - (totals.failed || 0), color: "#3b82f6", label: "Other" },
  ].filter((s) => s.value > 0);

  const completionPct = totals.total > 0
    ? Math.round(((totals.completed || 0) / totals.total) * 100)
    : 0;

  const jobChartData = volume_series.map((d, i) => ({
    t: d.t, total: d.v, failed: failure_series[i]?.v || 0,
  }));

  function changePeriod(p) { router.get(`${base}/jobs`, { period: p }, { preserveState: true }); }
  function openClass(jc) { setSheetItem(jc); setSheetType("class"); setSheetOpen(true); }
  function openFailure(f) { setSheetItem(f); setSheetType("failure"); setSheetOpen(true); }
  function openSqStat(label, items) { setSheetItem({ label, items }); setSheetType("sq_stat"); setSheetOpen(true); }

  const sheetTitle = sheetType === "sq_stat"
    ? (sheetItem?.label || "Jobs")
    : sheetType === "class"
    ? (sheetItem?.job_class || "Job")
    : `Failed: ${sheetItem?.job_class || "Job"}`;

  const sheetAi = (() => {
    if (!sheetItem) return "";
    if (sheetType === "class") return `Job Class: ${sheetItem.job_class}\nTotal: ${sheetItem.total}\nCompleted: ${sheetItem.completed_count}\nFailed: ${sheetItem.failed_count}\nQueued: ${sheetItem.queued_count}\nAvg duration: ${fmt(sheetItem.avg_duration)}\nMax duration: ${fmt(sheetItem.max_duration)}`;
    if (sheetType === "failure") return `Failed Job: ${sheetItem.job_class}\nQueue: ${sheetItem.queue || "default"}\nError: ${sheetItem.error_class}\nMessage: ${sheetItem.error_message}\nFailed at: ${sheetItem.occurred_at}`;
    return `${sheetItem.label}: ${sheetItem.items?.length || 0} items`;
  })();

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">

        <PageHeader
          title="Jobs"
          description="Background job monitoring and performance"
          actions={<><ExportButton baseUrl={`${base}/jobs/export`} /><PeriodSelect value={period} onChange={changePeriod} /></>}
        />

        {/* Stats + donut */}
        <div className="flex items-start gap-4">
          <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
            <Card>
              <CardHeader><CardDescription>Total Jobs</CardDescription></CardHeader>
              <CardContent><p className="text-2xl font-semibold tabular-nums">{totals.total || 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardDescription>Completed</CardDescription></CardHeader>
              <CardContent><p className="text-2xl font-semibold tabular-nums text-green-500">{totals.completed || 0}</p></CardContent>
            </Card>
            <Card className={cn(totals.failed > 0 && "border-red-200")}>
              <CardHeader><CardDescription>Failed</CardDescription></CardHeader>
              <CardContent><p className={cn("text-2xl font-semibold tabular-nums", totals.failed > 0 && "text-red-500")}>{totals.failed || 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardDescription>Avg Duration</CardDescription></CardHeader>
              <CardContent><p className="text-2xl font-semibold tabular-nums">{fmt(avgDuration)}</p></CardContent>
            </Card>
          </div>
          {(totals.total || 0) > 0 && (
            <DonutChart segments={donutSegments} size={110} strokeWidth={12} centerValue={`${completionPct}%`} centerLabel="complete" />
          )}
        </div>

        {volume_series.length > 0 && (
          <InteractiveBarChart
            data={jobChartData}
            series={[
              { key: "total", label: "Total Jobs", color: "#3b82f6" },
              { key: "failed", label: "Failed", color: "#ef4444" },
            ]}
            title="Job Volume"
            description="Job execution over time"
            height={250}
          />
        )}

        {/* Solid Queue */}
        {solid_queue && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Solid Queue</h2>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="flex flex-col h-auto gap-1 px-6 py-4" onClick={() => openSqStat("Ready Jobs", solid_queue.ready_jobs)}>
                <span className="text-2xl font-bold tabular-nums">{solid_queue.ready}</span>
                <span className="text-sm text-muted-foreground">Ready</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-auto gap-1 px-6 py-4" onClick={() => openSqStat("Scheduled Jobs", solid_queue.scheduled_jobs)}>
                <span className="text-2xl font-bold tabular-nums">{solid_queue.scheduled}</span>
                <span className="text-sm text-muted-foreground">Scheduled</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-auto gap-1 px-6 py-4" onClick={() => openSqStat("Running Jobs", solid_queue.claimed_jobs)}>
                <span className="text-2xl font-bold tabular-nums">{solid_queue.claimed}</span>
                <span className="text-sm text-muted-foreground">Running</span>
              </Button>
              <Button variant={solid_queue.failed > 0 ? "destructive" : "outline"} className="flex flex-col h-auto gap-1 px-6 py-4">
                <span className="text-2xl font-bold tabular-nums">{solid_queue.failed}</span>
                <span className="text-sm">Failed</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-auto gap-1 px-6 py-4" onClick={() => openSqStat("Worker Processes", solid_queue.worker_processes)}>
                <span className="text-2xl font-bold tabular-nums">{solid_queue.processes}</span>
                <span className="text-sm text-muted-foreground">Workers</span>
              </Button>
            </div>
          </div>
        )}

        {/* Job Classes table */}
        {job_classes.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Job Classes</h2>
            <Card>
              <InfiniteScroll data="job_classes" itemsElement="#jobs-tbody" startElement="#jobs-thead">
                <Table>
                  <TableHeader id="jobs-thead">
                    <TableRow>
                      <TableHead>Job Class</TableHead>
                      <TableHead className="w-16 text-right"><SortableHeader column="total" label="Total" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                      <TableHead className="w-16 text-right"><SortableHeader column="completed_count" label="Done" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                      <TableHead className="w-16 text-right"><SortableHeader column="failed_count" label="Failed" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                      <TableHead className="w-16 text-right">Queued</TableHead>
                      <TableHead className="w-20 text-right"><SortableHeader column="avg_duration" label="Avg" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                      <TableHead className="w-20 text-right"><SortableHeader column="max_duration" label="Max" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody id="jobs-tbody">
                    {job_classes.map((jc, i) => (
                      <TableRow key={`${jc.job_class}:${i}`} className="cursor-pointer" onClick={() => openClass(jc)}>
                        <TableCell className="font-medium">{jc.job_class}</TableCell>
                        <TableCell className="text-right tabular-nums">{jc.total}</TableCell>
                        <TableCell className="text-right tabular-nums text-green-500">{jc.completed_count}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", jc.failed_count > 0 && "text-red-500")}>{jc.failed_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{jc.queued_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(jc.avg_duration)}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", jc.max_duration > 10000 && "text-yellow-500")}>{fmt(jc.max_duration)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </InfiniteScroll>
            </Card>
          </div>
        )}

        {/* Recent Failures */}
        {failures.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Recent Failures</h2>
              <Badge variant="destructive">{failures.length}</Badge>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="w-24">Queue</TableHead>
                    <TableHead className="w-24 text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failures.map((f) => (
                    <TableRow key={f.id} className="cursor-pointer" onClick={() => openFailure(f)}>
                      <TableCell className="font-medium">{f.job_class || "Unknown"}</TableCell>
                      <TableCell className="text-red-500 text-sm">{f.error_class || "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{f.queue || "—"}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{timeAgo(f.occurred_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        ) : job_classes.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No job data yet</EmptyTitle>
              <EmptyDescription>Jobs will appear here once they start running.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={sheetTitle} aiContext={sheetAi}>
        {sheetItem && (
          <div className="flex flex-col divide-y p-4">
            {sheetType === "sq_stat" ? (
              <>
                <p className="py-3 text-sm text-muted-foreground">{sheetItem.items?.length || 0} item{sheetItem.items?.length === 1 ? "" : "s"}</p>
                {sheetItem.items?.length > 0 ? (
                  sheetItem.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 text-sm">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{item.job_class || item.kind || "—"}</span>
                        {item.queue && <span className="text-sm text-muted-foreground">{item.queue}</span>}
                        {item.hostname && <span className="text-sm text-muted-foreground">{item.hostname}:{item.pid}</span>}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {item.scheduled_at ? formatTime(item.scheduled_at)
                          : item.claimed_at ? formatTime(item.claimed_at)
                          : item.last_heartbeat_at ? `heartbeat: ${timeAgo(item.last_heartbeat_at)}`
                          : item.created_at ? formatTime(item.created_at)
                          : ""}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-3 text-sm text-muted-foreground">No items</p>
                )}
              </>
            ) : sheetType === "class" ? (
              <>
                <DetailRow label="Job Class">{sheetItem.job_class}</DetailRow>
                <DetailRow label="Total">{sheetItem.total}</DetailRow>
                <DetailRow label="Completed" valueClassName="text-green-500">{sheetItem.completed_count}</DetailRow>
                <DetailRow label="Failed" valueClassName={cn(sheetItem.failed_count > 0 && "text-red-500")}>{sheetItem.failed_count}</DetailRow>
                <DetailRow label="Queued">{sheetItem.queued_count}</DetailRow>
                <DetailRow label="Avg Duration">{fmt(sheetItem.avg_duration)}</DetailRow>
                <DetailRow label="Max Duration" valueClassName={cn(sheetItem.max_duration > 10000 && "text-yellow-500")}>{fmt(sheetItem.max_duration)}</DetailRow>
              </>
            ) : (
              <>
                <DetailRow label="Job Class">{sheetItem.job_class}</DetailRow>
                <DetailRow label="Queue">{sheetItem.queue || "—"}</DetailRow>
                {sheetItem.duration_ms && <DetailRow label="Duration">{fmt(sheetItem.duration_ms)}</DetailRow>}
                <DetailRow label="Failed At">{formatTime(sheetItem.occurred_at)}</DetailRow>
                <DetailRow label="Error Class" valueClassName="text-red-500">{sheetItem.error_class || "—"}</DetailRow>
                <DetailRow label="Source"><Badge variant="secondary">{sheetItem.source === "solid_queue" ? "Solid Queue" : "Daylight"}</Badge></DetailRow>
                {sheetItem.error_message && (
                  <div className="pt-3">
                    <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Error Message</p>
                    <pre className="overflow-auto rounded-md bg-muted p-3 text-sm font-mono">{sheetItem.error_message}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </EwSheet>
    </AppLayout>
  );
}

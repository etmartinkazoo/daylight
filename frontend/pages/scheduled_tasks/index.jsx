import { useState } from "react";
import { InfiniteScroll } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import AppLayout from "@/layouts/app-layout";
import PeriodSelect from "@/components/PeriodSelect";
import EwSheet from "@/components/errors/EwSheet";
import { InteractiveBarChart } from "@/components/charts/InteractiveBarChart";
import { ExportButton } from "@/components/ui/export-button";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { fmt, timeAgo, formatTime } from "@/lib/formatters.js";
import { DetailRow } from "@/components/ui/detail-row";
import { PageHeader } from "@/components/ui/page-header";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

export default function ScheduledTasksIndex({
  task_classes = [], failures = [], totals = {}, period = "24h",
  volume_series = [], failure_series = [],
  base_path: base = "/daylight", sort_column = null, sort_direction = null,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState(null);
  const [sheetType, setSheetType] = useState("class");

  const avgDuration = task_classes.length > 0
    ? task_classes.reduce((s, t) => s + (t.avg_duration || 0), 0) / task_classes.length
    : 0;

  const sheetTitle = sheetType === "class"
    ? (sheetItem?.task_class || "Task")
    : `Failed: ${sheetItem?.task_class || "Task"}`;

  const sheetAi = (() => {
    if (!sheetItem) return "";
    if (sheetType === "class") return `Task Class: ${sheetItem.task_class}\nTotal: ${sheetItem.total}\nCompleted: ${sheetItem.completed_count}\nFailed: ${sheetItem.failed_count}\nAvg duration: ${fmt(sheetItem.avg_duration)}\nMax duration: ${fmt(sheetItem.max_duration)}`;
    return `Failed Task: ${sheetItem.task_class}\nError: ${sheetItem.error_class}\nMessage: ${sheetItem.error_message}\nFailed at: ${sheetItem.occurred_at}`;
  })();


  function openClass(tc) { setSheetItem(tc); setSheetType("class"); setSheetOpen(true); }
  function openFailure(f) { setSheetItem(f); setSheetType("failure"); setSheetOpen(true); }

  const chartData = volume_series.map((d, i) => ({
    t: d.t, total: d.v, failed: failure_series[i]?.v || 0,
  }));

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">

        <PageHeader
          title="Scheduled Tasks"
          description="Recurring task monitoring and performance"
          actions={<><ExportButton baseUrl={`${base}/scheduled_tasks/export`} /><PeriodSelect value={period} href={`${base}/scheduled_tasks`} /></>}
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader><CardDescription>Total Runs</CardDescription></CardHeader>
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

        {volume_series.length > 0 && (
          <InteractiveBarChart
            data={chartData}
            series={[
              { key: "total", label: "Total Runs", color: "#3b82f6" },
              { key: "failed", label: "Failed", color: "#ef4444" },
            ]}
            title="Task Volume"
            description="Task execution over time"
            height={250}
          />
        )}

        {/* Task Classes table */}
        {task_classes.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Task Classes</h2>
            <Card>
              <InfiniteScroll data="task_classes" itemsElement="#tasks-tbody" startElement="#tasks-thead">
                <Table>
                  <TableHeader id="tasks-thead">
                    <TableRow>
                      <TableHead>Task Class</TableHead>
                      <TableHead className="w-16 text-right"><SortableHeader column="total" label="Total" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                      <TableHead className="w-16 text-right"><SortableHeader column="completed_count" label="Done" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                      <TableHead className="w-16 text-right"><SortableHeader column="failed_count" label="Failed" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                      <TableHead className="w-20 text-right"><SortableHeader column="avg_duration" label="Avg" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                      <TableHead className="w-20 text-right"><SortableHeader column="max_duration" label="Max" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody id="tasks-tbody">
                    {task_classes.map((tc, i) => (
                      <TableRow key={`${tc.task_class}:${i}`} className="cursor-pointer" onClick={() => openClass(tc)}>
                        <TableCell className="font-medium">{tc.task_class}</TableCell>
                        <TableCell className="text-right tabular-nums">{tc.total}</TableCell>
                        <TableCell className="text-right tabular-nums text-green-500">{tc.completed_count}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", tc.failed_count > 0 && "text-red-500")}>{tc.failed_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(tc.avg_duration)}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", tc.max_duration > 10000 && "text-yellow-500")}>{fmt(tc.max_duration)}</TableCell>
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
                    <TableHead>Task</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="w-24 text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failures.map((f) => (
                    <TableRow key={f.id} className="cursor-pointer" onClick={() => openFailure(f)}>
                      <TableCell className="font-medium">{f.task_class || "Unknown"}</TableCell>
                      <TableCell className="text-sm text-red-500">{f.error_class || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{timeAgo(f.occurred_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        ) : task_classes.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No scheduled task data yet</EmptyTitle>
              <EmptyDescription>Tasks will appear here once they start running.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={sheetTitle} aiContext={sheetAi}>
        {sheetItem && (
          <div className="flex flex-col divide-y p-4">
            {sheetType === "class" ? (
              <>
                <DetailRow label="Task Class">{sheetItem.task_class}</DetailRow>
                <DetailRow label="Total">{sheetItem.total}</DetailRow>
                <DetailRow label="Completed" valueClassName="text-green-500">{sheetItem.completed_count}</DetailRow>
                <DetailRow label="Failed" valueClassName={cn(sheetItem.failed_count > 0 && "text-red-500")}>{sheetItem.failed_count}</DetailRow>
                <DetailRow label="Avg Duration">{fmt(sheetItem.avg_duration)}</DetailRow>
                <DetailRow label="Max Duration" valueClassName={cn(sheetItem.max_duration > 10000 && "text-yellow-500")}>{fmt(sheetItem.max_duration)}</DetailRow>
              </>
            ) : (
              <>
                <DetailRow label="Task Class">{sheetItem.task_class}</DetailRow>
                {sheetItem.duration_ms && <DetailRow label="Duration">{fmt(sheetItem.duration_ms)}</DetailRow>}
                <DetailRow label="Failed At">{formatTime(sheetItem.occurred_at)}</DetailRow>
                <DetailRow label="Error Class" valueClassName="text-red-500">{sheetItem.error_class || "—"}</DetailRow>
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

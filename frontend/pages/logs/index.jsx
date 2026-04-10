import { useState } from "react";
import { Link, InfiniteScroll } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import AppLayout from "@/layouts/app-layout";
import PeriodSelect from "@/components/PeriodSelect";
import EwSheet from "@/components/errors/EwSheet";
import { AreaChart } from "@/components/charts/AreaChart";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { timeAgo } from "@/lib/formatters.js";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailRow } from "@/components/ui/detail-row";
import { PageHeader } from "@/components/ui/page-header";

function levelVariant(l) {
  if (l === "error" || l === "fatal") return "destructive";
  if (l === "warn") return "secondary";
  return "outline";
}

export default function LogsIndex({
  logs = [],
  counts = {},
  period = "24h",
  level = null,
  total_logs = 0,
  volume_series = [],
  base_path: base = "/daylight",
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

  const logsHref = `${base}/logs`;
  function openLog(log) {
    setSheetItem(log);
    setSheetOpen(true);
  }

  const sheetAi = sheetItem
    ? `Log Entry:\nLevel: ${sheetItem.level}\nMessage: ${sheetItem.message}\nController: ${sheetItem.controller || "N/A"}\nPath: ${sheetItem.path || "N/A"}\nTime: ${sheetItem.occurred_at || "N/A"}`
    : "";

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Logs"
          description={`Application log entries in the last ${period}`}
          actions={<PeriodSelect value={period} href={logsHref} params={{ level }} />}
        />

        {/* Level filter */}
        <Tabs
          value={level ?? "all"}
        >
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.label} value={tab.value ?? "all"} asChild>
                <Link href={logsHref} data={{ period, level: tab.value }} preserveState>
                  {tab.label}
                  {tab.count > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-sm">
                      {tab.count.toLocaleString()}
                    </Badge>
                  )}
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Total Logs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {total_logs.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Warn</CardDescription>
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  "text-2xl font-semibold tabular-nums",
                  warnCount > 0 && "text-amber-500",
                )}
              >
                {warnCount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Error</CardDescription>
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  "text-2xl font-semibold tabular-nums",
                  errorCount > 0 && "text-destructive",
                )}
              >
                {errorCount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Fatal</CardDescription>
            </CardHeader>
            <CardContent>
              <p
                className={cn(
                  "text-2xl font-semibold tabular-nums",
                  fatalCount > 0 && "text-destructive",
                )}
              >
                {fatalCount.toLocaleString()}
              </p>
            </CardContent>
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
              <AreaChart
                data={volume_series}
                width={700}
                height={80}
                color="#6366f1"
              />
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
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No log entries</EmptyTitle>
                <EmptyDescription>
                  No log entries recorded in this period.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <InfiniteScroll
              data="logs"
              itemsElement="#logs-tbody"
              startElement="#logs-thead"
            >
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
                      <TableCell>
                        <Badge variant={levelVariant(log.level)}>
                          {log.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-0 truncate text-sm">
                        {log.message}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.controller_action || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {log.request_path || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {timeAgo(log.occurred_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </InfiniteScroll>
          )}
        </Card>
      </div>

      <EwSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Log Detail"
        aiContext={sheetAi}
      >
        {sheetItem && (
          <div className="flex flex-col divide-y p-4">
            <DetailRow label="Level">
              <Badge variant={levelVariant(sheetItem.level)}>
                {sheetItem.level}
              </Badge>
            </DetailRow>
            {sheetItem.controller_action && (
              <DetailRow label="Controller">
                {sheetItem.controller_action}
              </DetailRow>
            )}
            {sheetItem.request_path && (
              <DetailRow label="Path" valueClassName="font-mono text-sm">
                {sheetItem.request_path}
              </DetailRow>
            )}
            {sheetItem.occurred_at && (
              <DetailRow label="Time">
                {new Date(sheetItem.occurred_at).toLocaleString()}
              </DetailRow>
            )}
            <div className="pt-3">
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Message
              </p>
              <pre className="overflow-auto rounded-md bg-muted p-3 text-sm font-mono whitespace-pre-wrap">
                {sheetItem.message}
              </pre>
            </div>
          </div>
        )}
      </EwSheet>
    </AppLayout>
  );
}

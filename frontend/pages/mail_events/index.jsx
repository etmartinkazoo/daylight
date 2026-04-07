import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import DaylightLayout from "../DaylightLayout";
import PeriodSelect from "../PeriodSelect";
import EwSheet from "../errors/EwSheet";
import { InteractiveBarChart } from "@/components/charts/InteractiveBarChart";
import { ExportButton } from "@/components/ui/export-button";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { fmt, timeAgo, formatTime } from "@/lib/formatters.js";

export default function MailEventsIndex({
  mailers = [], events = [], totals = {}, period = "24h", selected_mailer = null,
  volume_series = [], base_path: base = "/daylight",
  sort_column = null, sort_direction = null,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState(null);
  const [sheetType, setSheetType] = useState("mailer");

  const deliveryRate = totals.total > 0
    ? Math.round(((totals.delivered || 0) / totals.total) * 100)
    : 0;

  const sheetTitle = sheetType === "mailer"
    ? (sheetItem?.mailer_class || "Mailer")
    : `${sheetItem?.mailer_class || "Mail"}: ${sheetItem?.subject || "Event"}`;

  const sheetAi = (() => {
    if (!sheetItem) return "";
    if (sheetType === "mailer") return `Mailer Class: ${sheetItem.mailer_class}\nTotal: ${sheetItem.total}\nDelivered: ${sheetItem.delivered_count}\nFailed: ${sheetItem.failed_count}\nAvg duration: ${fmt(sheetItem.avg_duration)}`;
    return `Mailer: ${sheetItem.mailer_class}\nSubject: ${sheetItem.subject || "—"}\nRecipients: ${sheetItem.recipients || "—"}\nChannel: ${sheetItem.channel || "email"}\nStatus: ${sheetItem.status || "—"}\nTime: ${sheetItem.occurred_at}`;
  })();

  function changePeriod(p) { router.get(`${base}/mail_events`, { period: p }, { preserveState: true }); }
  function openMailer(ml) { setSheetItem(ml); setSheetType("mailer"); setSheetOpen(true); }
  function openEvent(ev) { setSheetItem(ev); setSheetType("event"); setSheetOpen(true); }

  const chartData = volume_series.map((d) => ({ t: d.t, mail: d.v }));

  function statusVariant(status) {
    if (status === "delivered") return "default";
    if (status === "failed") return "destructive";
    return "secondary";
  }

  const deliveryRateColor = deliveryRate >= 95 ? "text-green-500" : deliveryRate >= 80 ? "text-yellow-500" : "text-red-500";

  return (
    <DaylightLayout>
      <div className="flex flex-col gap-6 p-6">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">Mail &amp; Notifications</h1>
            <p className="text-sm text-muted-foreground">Email and notification delivery monitoring</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton baseUrl={`${base}/mail_events/export`} />
            <PeriodSelect value={period} onChange={changePeriod} />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader><CardDescription>Total Sent</CardDescription></CardHeader>
            <CardContent><p className="text-2xl font-semibold tabular-nums">{totals.total || 0}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardDescription>Delivered</CardDescription></CardHeader>
            <CardContent><p className="text-2xl font-semibold tabular-nums text-green-500">{totals.delivered || 0}</p></CardContent>
          </Card>
          <Card className={cn(totals.failed > 0 && "border-red-200")}>
            <CardHeader><CardDescription>Failed</CardDescription></CardHeader>
            <CardContent><p className={cn("text-2xl font-semibold tabular-nums", totals.failed > 0 && "text-red-500")}>{totals.failed || 0}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardDescription>Delivery Rate</CardDescription></CardHeader>
            <CardContent><p className={cn("text-2xl font-semibold tabular-nums", deliveryRateColor)}>{deliveryRate}%</p></CardContent>
          </Card>
        </div>

        {volume_series.length > 0 && (
          <InteractiveBarChart
            data={chartData}
            series={[{ key: "mail", label: "Mail Sent", color: "#8b5cf6" }]}
            title="Mail Volume"
            description="Mail delivery over time"
            height={250}
          />
        )}

        {/* Mailer Classes table */}
        {mailers.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Mailer Classes</h2>
            <Card>
              <InfiniteScroll data="mailers" itemsElement="#mailers-tbody" startElement="#mailers-thead">
                <Table>
                  <TableHeader id="mailers-thead">
                    <TableRow>
                      <TableHead>Mailer Class</TableHead>
                      <TableHead className="w-16 text-right"><SortableHeader column="total" label="Total" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                      <TableHead className="w-24 text-right"><SortableHeader column="delivered_count" label="Delivered" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                      <TableHead className="w-16 text-right"><SortableHeader column="failed_count" label="Failed" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                      <TableHead className="w-20 text-right"><SortableHeader column="avg_duration" label="Avg" sort_column={sort_column} sort_direction={sort_direction} /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody id="mailers-tbody">
                    {mailers.map((ml, i) => (
                      <TableRow key={`${ml.mailer_class}:${i}`} className="cursor-pointer" onClick={() => openMailer(ml)}>
                        <TableCell className="font-medium">{ml.mailer_class}</TableCell>
                        <TableCell className="text-right tabular-nums">{ml.total}</TableCell>
                        <TableCell className="text-right tabular-nums text-green-500">{ml.delivered_count}</TableCell>
                        <TableCell className={cn("text-right tabular-nums", ml.failed_count > 0 && "text-red-500")}>{ml.failed_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmt(ml.avg_duration)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </InfiniteScroll>
            </Card>
          </div>
        )}

        {/* Recent Events */}
        {events.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Recent Events</h2>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mailer</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-20">Channel</TableHead>
                    <TableHead className="w-24 text-right">When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((ev) => (
                    <TableRow key={ev.id} className="cursor-pointer" onClick={() => openEvent(ev)}>
                      <TableCell className="font-medium">{ev.mailer_class || "Unknown"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ev.subject || "—"}</TableCell>
                      <TableCell><Badge variant={statusVariant(ev.status)}>{ev.status || "—"}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ev.channel || "email"}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{timeAgo(ev.occurred_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        ) : mailers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
            </svg>
            <p className="font-medium">No mail data yet</p>
            <p>Mail events will appear here once your app starts sending emails.</p>
          </div>
        ) : null}
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={sheetTitle} aiContext={sheetAi}>
        {sheetItem && (
          <div className="flex flex-col divide-y p-4">
            {sheetType === "mailer" ? (
              <>
                <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Mailer Class</span><span>{sheetItem.mailer_class}</span></div>
                <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Total</span><span>{sheetItem.total}</span></div>
                <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Delivered</span><span className="text-green-500">{sheetItem.delivered_count}</span></div>
                <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Failed</span><span className={cn(sheetItem.failed_count > 0 && "text-red-500")}>{sheetItem.failed_count}</span></div>
                <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Avg Duration</span><span>{fmt(sheetItem.avg_duration)}</span></div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Mailer Class</span><span>{sheetItem.mailer_class}</span></div>
                <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Subject</span><span>{sheetItem.subject || "—"}</span></div>
                <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Recipients</span><span>{sheetItem.recipients || "—"}</span></div>
                <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Channel</span><Badge variant="secondary">{sheetItem.channel || "email"}</Badge></div>
                <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Status</span><Badge variant={statusVariant(sheetItem.status)}>{sheetItem.status || "—"}</Badge></div>
                {sheetItem.duration_ms && <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Duration</span><span>{fmt(sheetItem.duration_ms)}</span></div>}
                <div className="flex items-center justify-between py-3 text-sm"><span className="text-muted-foreground">Time</span><span>{formatTime(sheetItem.occurred_at)}</span></div>
                {sheetItem.error_message && (
                  <div className="pt-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Error</p>
                    <pre className="overflow-auto rounded-md bg-muted p-3 text-xs font-mono">{sheetItem.error_message}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </EwSheet>
    </DaylightLayout>
  );
}

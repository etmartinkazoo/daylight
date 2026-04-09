import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
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
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { DetailRow } from "@/components/ui/detail-row";
import { PageHeader } from "@/components/ui/page-header";

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
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">

        <PageHeader
          title="Mail & Notifications"
          description="Email and notification delivery monitoring"
          actions={<><ExportButton baseUrl={`${base}/mail_events/export`} /><PeriodSelect value={period} onChange={changePeriod} /></>}
        />

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
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No mail data yet</EmptyTitle>
              <EmptyDescription>Mail events will appear here once your app starts sending emails.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={sheetTitle} aiContext={sheetAi}>
        {sheetItem && (
          <div className="flex flex-col divide-y p-4">
            {sheetType === "mailer" ? (
              <>
                <DetailRow label="Mailer Class">{sheetItem.mailer_class}</DetailRow>
                <DetailRow label="Total">{sheetItem.total}</DetailRow>
                <DetailRow label="Delivered" valueClassName="text-green-500">{sheetItem.delivered_count}</DetailRow>
                <DetailRow label="Failed" valueClassName={cn(sheetItem.failed_count > 0 && "text-red-500")}>{sheetItem.failed_count}</DetailRow>
                <DetailRow label="Avg Duration">{fmt(sheetItem.avg_duration)}</DetailRow>
              </>
            ) : (
              <>
                <DetailRow label="Mailer Class">{sheetItem.mailer_class}</DetailRow>
                <DetailRow label="Subject">{sheetItem.subject || "—"}</DetailRow>
                <DetailRow label="Recipients">{sheetItem.recipients || "—"}</DetailRow>
                <DetailRow label="Channel"><Badge variant="secondary">{sheetItem.channel || "email"}</Badge></DetailRow>
                <DetailRow label="Status"><Badge variant={statusVariant(sheetItem.status)}>{sheetItem.status || "—"}</Badge></DetailRow>
                {sheetItem.duration_ms && <DetailRow label="Duration">{fmt(sheetItem.duration_ms)}</DetailRow>}
                <DetailRow label="Time">{formatTime(sheetItem.occurred_at)}</DetailRow>
                {sheetItem.error_message && (
                  <div className="pt-3">
                    <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Error</p>
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

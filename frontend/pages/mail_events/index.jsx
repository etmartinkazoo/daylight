import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import DaylightLayout from "../DaylightLayout";
import PeriodSelect from "../PeriodSelect";
import EwSheet from "../errors/EwSheet";
import InteractiveBarChart from "@/components/charts/InteractiveBarChart";
import { ExportButton } from "@/components/ui/export-button";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const deliveryRateColor = deliveryRate >= 95 ? "#22c55e" : deliveryRate >= 80 ? "#f59e0b" : "#ef4444";

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

  return (
    <DaylightLayout>
      <div className="dl-page">
        <div className="dl-page-header">
          <div>
            <h1 className="dl-page-title">Mail &amp; Notifications</h1>
            <p className="dl-page-subtitle">Email and notification delivery monitoring</p>
          </div>
          <div className="header-controls">
            <ExportButton baseUrl={`${base}/mail_events/export`} />
            <PeriodSelect value={period} onChange={changePeriod} />
          </div>
        </div>

        <div className="dl-stat-grid">
          <div className="stat-card"><span className="stat-card-label">Total Sent</span><span className="stat-card-value">{totals.total || 0}</span></div>
          <div className="stat-card"><span className="stat-card-label">Delivered</span><span className="stat-card-value" style={{ color: "#22c55e" }}>{totals.delivered || 0}</span></div>
          <div className={`stat-card${totals.failed > 0 ? " stat-card-danger" : ""}`}>
            <span className="stat-card-label">Failed</span>
            <span className="stat-card-value">{totals.failed || 0}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Delivery Rate</span>
            <span className="stat-card-value" style={{ color: deliveryRateColor }}>{deliveryRate}%</span>
          </div>
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

        {mailers.length > 0 && (
          <div className="section">
            <h2 className="section-title">Mailer Classes</h2>
            <div className="dl-data-table">
              <InfiniteScroll data="mailers" itemsElement="#mailers-tbody" startElement="#mailers-thead">
                <table className="dl-table">
                  <thead id="mailers-thead">
                    <tr>
                      <th style={{ flex: 2 }}>Mailer Class</th>
                      <th style={{ width: "4rem", textAlign: "right" }}><SortableHeader column="total" label="Total" sort_column={sort_column} sort_direction={sort_direction} /></th>
                      <th style={{ width: "5rem", textAlign: "right" }}><SortableHeader column="delivered_count" label="Delivered" sort_column={sort_column} sort_direction={sort_direction} /></th>
                      <th style={{ width: "4rem", textAlign: "right" }}><SortableHeader column="failed_count" label="Failed" sort_column={sort_column} sort_direction={sort_direction} /></th>
                      <th style={{ width: "5rem", textAlign: "right" }}><SortableHeader column="avg_duration" label="Avg" sort_column={sort_column} sort_direction={sort_direction} /></th>
                    </tr>
                  </thead>
                  <tbody id="mailers-tbody">
                    {mailers.map((ml, i) => (
                      <tr key={`${ml.mailer_class}:${i}`} className="row" onClick={() => openMailer(ml)} style={{ cursor: "pointer" }}>
                        <td className="cell" style={{ flex: 2 }}><span className="mailer-name">{ml.mailer_class}</span></td>
                        <td className="cell num" style={{ width: "4rem" }}>{ml.total}</td>
                        <td className="cell num delivered" style={{ width: "5rem" }}>{ml.delivered_count}</td>
                        <td className={`cell num${ml.failed_count > 0 ? " failed-val" : ""}`} style={{ width: "4rem" }}>{ml.failed_count}</td>
                        <td className="cell num" style={{ width: "5rem" }}>{fmt(ml.avg_duration)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </InfiniteScroll>
            </div>
          </div>
        )}

        {events.length > 0 ? (
          <div className="section">
            <h2 className="section-title">Recent Events</h2>
            <div className="dl-data-table">
              <div className="dl-table-header">
                <div className="dl-th" style={{ flex: 1.5 }}>Mailer</div>
                <div className="dl-th" style={{ flex: 1 }}>Subject</div>
                <div className="dl-th" style={{ width: "5rem" }}>Status</div>
                <div className="dl-th" style={{ width: "4rem" }}>Channel</div>
                <div className="dl-th dl-th-right" style={{ width: "5.5rem" }}>When</div>
              </div>
              {events.map((ev) => (
                <Button key={ev.id} variant="ghost" className="dl-table-row w-full justify-start h-auto rounded-none" onClick={() => openEvent(ev)}>
                  <div className="dl-td" style={{ flex: 1.5 }}><span className="event-mailer">{ev.mailer_class || "Unknown"}</span></div>
                  <div className="dl-td" style={{ flex: 1 }}><span className="event-subject">{ev.subject || "—"}</span></div>
                  <div className="dl-td" style={{ width: "5rem" }}>
                    <Badge variant={statusVariant(ev.status)}>
                      {ev.status || "—"}
                    </Badge>
                  </div>
                  <div className="dl-td" style={{ width: "4rem" }}><span className="event-channel">{ev.channel || "email"}</span></div>
                  <div className="dl-td dl-td-num" style={{ width: "5.5rem" }}><span className="event-time">{timeAgo(ev.occurred_at)}</span></div>
                </Button>
              ))}
            </div>
          </div>
        ) : mailers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <p className="empty-title">No mail data yet</p>
            <p className="empty-sub">Mail events will appear here once your app starts sending emails.</p>
          </div>
        ) : null}
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={sheetTitle} aiContext={sheetAi}>
        {sheetItem && (
          <div className="dl-sheet-detail">
            {sheetType === "mailer" ? (
              <dl className="dl-dl">
                <div className="dl-dl-row"><dt>Mailer Class</dt><dd>{sheetItem.mailer_class}</dd></div>
                <div className="dl-dl-row"><dt>Total</dt><dd>{sheetItem.total}</dd></div>
                <div className="dl-dl-row"><dt>Delivered</dt><dd className="ok">{sheetItem.delivered_count}</dd></div>
                <div className="dl-dl-row"><dt>Failed</dt><dd className={sheetItem.failed_count > 0 ? "err" : ""}>{sheetItem.failed_count}</dd></div>
                <div className="dl-dl-row"><dt>Avg Duration</dt><dd>{fmt(sheetItem.avg_duration)}</dd></div>
              </dl>
            ) : (
              <>
                <dl className="dl-dl">
                  <div className="dl-dl-row"><dt>Mailer Class</dt><dd>{sheetItem.mailer_class}</dd></div>
                  <div className="dl-dl-row"><dt>Subject</dt><dd>{sheetItem.subject || "—"}</dd></div>
                  <div className="dl-dl-row"><dt>Recipients</dt><dd>{sheetItem.recipients || "—"}</dd></div>
                  <div className="dl-dl-row"><dt>Channel</dt><dd><Badge variant="secondary">{sheetItem.channel || "email"}</Badge></dd></div>
                  <div className="dl-dl-row">
                    <dt>Status</dt>
                    <dd>
                      <Badge variant={statusVariant(sheetItem.status)}>
                        {sheetItem.status || "—"}
                      </Badge>
                    </dd>
                  </div>
                  {sheetItem.duration_ms && <div className="dl-dl-row"><dt>Duration</dt><dd>{fmt(sheetItem.duration_ms)}</dd></div>}
                  <div className="dl-dl-row"><dt>Time</dt><dd>{formatTime(sheetItem.occurred_at)}</dd></div>
                </dl>
                {sheetItem.error_message && (
                  <>
                    <h4 className="sheet-sub">Error</h4>
                    <pre className="sheet-pre">{sheetItem.error_message}</pre>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </EwSheet>
    </DaylightLayout>
  );
}

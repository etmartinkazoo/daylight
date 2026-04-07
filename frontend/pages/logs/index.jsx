import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import DaylightLayout from "../DaylightLayout";
import PeriodSelect from "../PeriodSelect";
import EwSheet from "../errors/EwSheet";
import AreaChart from "@/components/charts/AreaChart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/formatters.js";

function levelVariant(l) {
  if (l === "error" || l === "fatal") return "destructive";
  if (l === "warn") return "secondary";
  return "outline";
}

function levelClass(l) {
  if (l === "debug") return "level-debug";
  if (l === "info") return "level-info";
  if (l === "warn") return "level-warn";
  if (l === "error") return "level-error";
  if (l === "fatal") return "level-fatal";
  return "level-debug";
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
      <div className="dl-page">
        <div className="dl-page-header">
          <div>
            <h1 className="dl-page-title">Logs</h1>
            <p className="dl-page-subtitle">Application log entries in the last {period}</p>
          </div>
          <div className="dl-period-selector">
            <PeriodSelect value={period} onChange={changePeriod} />
          </div>
        </div>

        <div className="level-tabs">
          {tabs.map((tab) => (
            <Button
              key={tab.label}
              variant={level === tab.value ? "default" : "ghost"}
              size="sm"
              className="level-tab"
              onClick={() => changeLevel(tab.value)}
            >
              {tab.label}
              {tab.count > 0 && <span className="tab-count">{tab.count.toLocaleString()}</span>}
            </Button>
          ))}
        </div>

        <div className="dl-stat-grid">
          <div className="stat-card"><span className="stat-card-label">Total Logs</span><span className="stat-card-value">{total_logs.toLocaleString()}</span></div>
          <div className="stat-card"><span className="stat-card-label">Warn</span><span className={`stat-card-value${warnCount > 0 ? " stat-warn" : ""}`}>{warnCount.toLocaleString()}</span></div>
          <div className="stat-card"><span className="stat-card-label">Error</span><span className={`stat-card-value${errorCount > 0 ? " stat-danger" : ""}`}>{errorCount.toLocaleString()}</span></div>
          <div className="stat-card"><span className="stat-card-label">Fatal</span><span className={`stat-card-value${fatalCount > 0 ? " stat-fatal" : ""}`}>{fatalCount.toLocaleString()}</span></div>
        </div>

        {volume_series.length >= 2 && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-sm">Log Volume</CardTitle>
              <span className="dl-card-subtitle">Over time</span>
            </CardHeader>
            <CardContent>
              <AreaChart data={volume_series} width={700} height={80} color="#6366f1" />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm">Log Entries</CardTitle>
            <span className="dl-card-subtitle">{logs.length} entries</span>
          </CardHeader>
          <div className="dl-data-table">
            {logs.length === 0 ? (
              <div className="dl-table-empty">
                <svg width="24" height="24" fill="none" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                <span>No log entries recorded in this period.</span>
              </div>
            ) : (
              <InfiniteScroll data="logs" itemsElement="#logs-tbody" startElement="#logs-thead">
                <table className="dl-table">
                  <thead id="logs-thead">
                    <tr>
                      <th style={{ width: "5rem" }}>Level</th>
                      <th style={{ flex: 3 }}>Message</th>
                      <th style={{ flex: 1 }}>Controller</th>
                      <th style={{ flex: 1 }}>Path</th>
                      <th style={{ width: "5rem", textAlign: "right" }}>Time</th>
                    </tr>
                  </thead>
                  <tbody id="logs-tbody">
                    {logs.map((log) => (
                      <tr
                        key={log.id || `${log.message}${log.occurred_at}`}
                        className="row"
                        onClick={() => openLog(log)}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="cell">
                          <Badge variant={levelVariant(log.level)} className={levelClass(log.level)}>{log.level}</Badge>
                        </td>
                        <td className="cell td-message">
                          <span className="message-text">{log.message}</span>
                        </td>
                        <td className="cell td-source">{log.controller_action || "—"}</td>
                        <td className="cell td-source">{log.request_path || "—"}</td>
                        <td className="cell num">{timeAgo(log.occurred_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </InfiniteScroll>
            )}
          </div>
        </Card>
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Log Detail" aiContext={sheetAi}>
        {sheetItem && (
          <div className="dl-sheet-detail">
            <dl className="dl-dl">
              <div className="dl-dl-row"><dt>Level</dt><dd><Badge variant={levelVariant(sheetItem.level)} className={levelClass(sheetItem.level)}>{sheetItem.level}</Badge></dd></div>
              {sheetItem.controller_action && <div className="dl-dl-row"><dt>Controller</dt><dd>{sheetItem.controller_action}</dd></div>}
              {sheetItem.request_path && <div className="dl-dl-row"><dt>Path</dt><dd className="dl-mono">{sheetItem.request_path}</dd></div>}
              {sheetItem.occurred_at && <div className="dl-dl-row"><dt>Time</dt><dd>{new Date(sheetItem.occurred_at).toLocaleString()}</dd></div>}
            </dl>
            <h4 className="sheet-sub">Message</h4>
            <pre className="sheet-message">{sheetItem.message}</pre>
          </div>
        )}
      </EwSheet>
    </DaylightLayout>
  );
}

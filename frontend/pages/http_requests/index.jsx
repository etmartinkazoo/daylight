import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import DaylightLayout from "../DaylightLayout";
import PeriodSelect from "../PeriodSelect";
import EwSheet from "../errors/EwSheet";
import AreaChart from "@/components/charts/AreaChart";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
      <div className="dl-page">
        <div className="dl-page-header">
          <div>
            <h1 className="dl-page-title">Outgoing HTTP</h1>
            <p className="dl-page-subtitle">{total_requests.toLocaleString()} requests in the last {period}</p>
          </div>
          <div className="dl-period-selector">
            <PeriodSelect value={period} onChange={changePeriod} />
          </div>
        </div>

        {selected_host && host_requests.length > 0 ? (
          <>
            <Button variant="ghost" size="sm" onClick={goBack} className="mb-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              All hosts
            </Button>
            <div className="drilldown-header">
              <h2 className="route-title">{selected_host}</h2>
              <span className="drilldown-count">{host_requests.length} requests</span>
            </div>
            <Card>
              <div className="dl-data-table">
                <div className="dl-table-header">
                  <div className="dl-th" style={{ width: "4.5rem" }}>Status</div>
                  <div className="dl-th" style={{ flex: 3 }}>URL</div>
                  <div className="dl-th dl-th-right" style={{ width: "5.5rem" }}>Duration</div>
                  <div className="dl-th dl-th-right" style={{ width: "5rem" }}>When</div>
                </div>
                {host_requests.map((req) => (
                  <Button key={req.id || `${req.url}${req.occurred_at}`} variant="ghost" className="dl-table-row w-full justify-start h-auto rounded-none" onClick={() => openRequest(req)}>
                    <div className="dl-td" style={{ width: "4.5rem" }}>
                      <Badge variant={statusBadgeVariant(req.status_code)}>{req.status_code}</Badge>
                    </div>
                    <div className="dl-td td-url" style={{ flex: 3 }}>
                      <span className="url-text">{req.url}</span>
                    </div>
                    <div className={`dl-td dl-td-num${req.duration_ms > 2000 ? " td-danger" : ""}`} style={{ width: "5.5rem" }}>{fmt(req.duration_ms)}</div>
                    <div className="dl-td dl-td-num" style={{ width: "5rem" }}><span className="time-ago">{timeAgo(req.occurred_at)}</span></div>
                  </Button>
                ))}
              </div>
            </Card>
          </>
        ) : (
          <>
            <div className="dl-stat-grid">
              <div className="stat-card"><span className="stat-card-label">Total Requests</span><span className="stat-card-value">{total_requests.toLocaleString()}</span></div>
              <div className="stat-card"><span className="stat-card-label">Unique Hosts</span><span className="stat-card-value">{uniqueHosts.toLocaleString()}</span></div>
              <div className="stat-card"><span className="stat-card-label">Avg Duration</span><span className="stat-card-value">{fmt(avgDuration)}</span></div>
              <div className="stat-card"><span className="stat-card-label">Error Rate</span><span className={`stat-card-value${totalErrors > 0 ? " stat-danger" : ""}`}>{errorRate}%</span></div>
            </div>

            {volume_series.length >= 2 && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-sm">Request Volume</CardTitle>
                  <span className="dl-card-subtitle">Over time</span>
                </CardHeader>
                <CardContent>
                  <AreaChart data={volume_series} width={700} height={80} color="#3b82f6" />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-sm">Hosts</CardTitle>
                <span className="dl-card-subtitle">{hosts.length} hosts</span>
              </CardHeader>
              <div className="dl-data-table">
                {hosts.length === 0 ? (
                  <div className="dl-table-empty">
                    <svg width="24" height="24" fill="none" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    <span>No outgoing HTTP requests recorded in this period.</span>
                  </div>
                ) : (
                  <InfiniteScroll data="hosts" itemsElement="#hosts-tbody" startElement="#hosts-thead">
                    <table className="dl-table">
                      <thead id="hosts-thead">
                        <tr>
                          <th style={{ flex: 2 }}>Host</th>
                          <th style={{ width: "5rem", textAlign: "right" }}><SortableHeader column="total" label="Requests" sort_column={sort_column} sort_direction={sort_direction} /></th>
                          <th style={{ width: "5rem", textAlign: "right" }}><SortableHeader column="avg_duration" label="Avg" sort_column={sort_column} sort_direction={sort_direction} /></th>
                          <th style={{ width: "5rem", textAlign: "right" }}><SortableHeader column="max_duration" label="Max" sort_column={sort_column} sort_direction={sort_direction} /></th>
                          <th style={{ width: "4.5rem", textAlign: "right" }}>Errors</th>
                        </tr>
                      </thead>
                      <tbody id="hosts-tbody">
                        {hosts.map((host, i) => (
                          <tr key={`${host.host}:${i}`} className="row" onClick={() => selectHost(host)} style={{ cursor: "pointer" }}>
                            <td className="cell" style={{ flex: 2 }}><span className="host-name">{host.host}</span></td>
                            <td className="cell num" style={{ width: "5rem" }}>{host.total}</td>
                            <td className="cell num" style={{ width: "5rem" }}>{fmt(host.avg_duration)}</td>
                            <td className={`cell num${host.max_duration > 5000 ? " td-danger" : ""}`} style={{ width: "5rem" }}>{fmt(host.max_duration)}</td>
                            <td className={`cell num${host.error_count > 0 ? " td-danger" : ""}`} style={{ width: "4.5rem" }}>{host.error_count || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </InfiniteScroll>
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="HTTP Request Detail" aiContext={sheetAi}>
        {sheetItem && (
          <div className="dl-sheet-detail">
            <dl className="dl-dl">
              {sheetItem.method && <div className="dl-dl-row"><dt>Method</dt><dd>{sheetItem.method}</dd></div>}
              <div className="dl-dl-row"><dt>URL</dt><dd className="dl-mono">{sheetItem.url}</dd></div>
              <div className="dl-dl-row">
                <dt>Status</dt>
                <dd><Badge variant={statusBadgeVariant(sheetItem.status_code)}>{sheetItem.status_code}</Badge></dd>
              </div>
              <div className="dl-dl-row"><dt>Duration</dt><dd className={sheetItem.duration_ms > 2000 ? "td-danger" : ""}>{fmt(sheetItem.duration_ms)}</dd></div>
              {sheetItem.occurred_at && <div className="dl-dl-row"><dt>Time</dt><dd>{new Date(sheetItem.occurred_at).toLocaleString()}</dd></div>}
            </dl>
            {sheetItem.response_body && (
              <>
                <h4 className="sheet-sub">Response</h4>
                <pre className="sheet-pre">{sheetItem.response_body}</pre>
              </>
            )}
          </div>
        )}
      </EwSheet>
    </DaylightLayout>
  );
}

import { useState, useEffect, useRef } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import DaylightLayout from "../DaylightLayout";
import PeriodSelect from "../PeriodSelect";
import EwSheet from "../errors/EwSheet";
import BarList from "@/components/charts/BarList";
import InteractiveBarChart from "@/components/charts/InteractiveBarChart";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { ExportButton } from "@/components/ui/export-button";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmt, timeAgo, formatTime, statusCodeClass, methodColor } from "@/lib/formatters.js";

export default function RequestsIndex({
  endpoints = [], route_requests = [], selected_request = null,
  selected_route = null, period = "24h", total_requests = 0,
  throughput_rpm = 0, apdex = null, latency_series = [], throughput_series = [], deploys = [],
  base_path: base = "/daylight", sort_column = null, sort_direction = null,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState(null);
  const [sheetType, setSheetType] = useState("endpoint");
  const [refreshInterval, setRefreshInterval] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        router.reload({ preserveState: true, preserveScroll: true });
      }, refreshInterval);
    }
    return () => clearInterval(intervalRef.current);
  }, [refreshInterval]);

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

  function changePeriod(p) { router.get(`${base}/requests`, { period: p }, { preserveState: true }); }
  function selectEndpoint(ep) { router.get(`${base}/requests`, { period, route: ep.route }, { preserveState: true }); }
  function goBack() { router.get(`${base}/requests`, { period }, { preserveState: true }); }

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
    <DaylightLayout>
      <div className="dl-page">
        <div className="dl-page-header">
          <div>
            <h1 className="dl-page-title">Requests</h1>
            <p className="dl-page-subtitle">{total_requests.toLocaleString()} requests in the last {period}</p>
          </div>
          <div className="header-controls">
            <AutoRefresh interval={refreshInterval} onChange={setRefreshInterval} />
            <ExportButton baseUrl={`${base}/requests/export`} />
            <PeriodSelect value={period} onChange={changePeriod} />
          </div>
        </div>

        {selected_route && route_requests.length > 0 ? (
          <>
            <Button variant="ghost" size="sm" onClick={goBack} className="mb-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              All endpoints
            </Button>
            <div className="drilldown-header">
              <h2 className="route-title">{selected_route}</h2>
              <span className="drilldown-count">{route_requests.length} requests</span>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th" style={{ width: "4.5rem" }}>Status</th>
                    <th className="th" style={{ width: "auto" }}>Path</th>
                    <th className="th r" style={{ width: "5.5rem" }}>Duration</th>
                    <th className="th r" style={{ width: "4.5rem" }}>DB</th>
                    <th className="th r" style={{ width: "3.5rem" }}>Qry</th>
                    <th className="th" style={{ width: "5rem" }}>IP</th>
                    <th className="th r" style={{ width: "4.5rem" }}>When</th>
                  </tr>
                </thead>
                <tbody>
                  {route_requests.map((req) => (
                    <tr key={req.id} className="row" onClick={() => openRequest(req)}>
                      <td className="cell"><Badge variant={statusBadgeVariant(req.status_code)}>{req.status_code}</Badge></td>
                      <td className="cell mono-cell">{req.path}</td>
                      <td className={`cell num${req.duration_ms > 500 ? " slow" : ""}`}>{fmt(req.duration_ms)}</td>
                      <td className="cell num">{fmt(req.db_duration_ms)}</td>
                      <td className="cell num">{req.query_count}</td>
                      <td className="cell"><span className="ip-text">{req.ip}</span></td>
                      <td className="cell r"><span className="time-ago">{timeAgo(req.occurred_at)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="stats-row">
              <div className="stats-grid stats-grid-3col">
                <div className="stat-card"><span className="stat-card-label">Total Requests</span><span className="stat-card-value">{statTotal.toLocaleString()}</span></div>
                <div className="stat-card"><span className="stat-card-label">Avg Response Time</span><span className="stat-card-value">{fmt(statAvg)}</span></div>
                <div className="stat-card">
                  <span className="stat-card-label">Error Rate (5xx)</span>
                  <span className={`stat-card-value${statErrors > 0 ? " stat-danger" : ""}`}>{statErrorRate}%</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card-label">P95 Response Time</span>
                  <span className={`stat-card-value${statP95 > 500 ? " stat-warn" : ""}`}>{fmt(statP95)}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card-label">Throughput</span>
                  <span className="stat-card-value">{throughput_rpm}<span className="stat-unit"> req/min</span></span>
                </div>
                {apdex != null && (
                  <div className="stat-card">
                    <span className="stat-card-label">Apdex</span>
                    <span className="stat-card-value" style={{ color: apdexColor }}>{apdex.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="chart-card">
                <h3 className="chart-title">Slowest Endpoints</h3>
                <BarList items={topEndpoints} valueFormatter={fmt} color="#6366f1" />
              </div>
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

            <div className="table-container">
              {endpoints.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-text">No request data yet</p>
                  <p className="empty-hint">Requests are tracked automatically once your app starts serving traffic.</p>
                </div>
              ) : (
                <InfiniteScroll data="endpoints" itemsElement="#endpoints-tbody" startElement="#endpoints-thead">
                  <table className="table">
                    <thead id="endpoints-thead">
                      <tr>
                        <th className="th" style={{ width: "auto" }}>Route</th>
                        <th className="th r" style={{ width: "4rem" }}><SortableHeader column="total" label="Reqs" sort_column={sort_column} sort_direction={sort_direction} /></th>
                        <th className="th r" style={{ width: "5rem" }}><SortableHeader column="avg_duration" label="Avg" sort_column={sort_column} sort_direction={sort_direction} /></th>
                        <th className="th r" style={{ width: "5rem" }}>P95</th>
                        <th className="th r" style={{ width: "5rem" }}><SortableHeader column="max_duration" label="Max" sort_column={sort_column} sort_direction={sort_direction} /></th>
                        <th className="th c" style={{ width: "3.5rem" }}><SortableHeader column="ok_count" label="2xx" sort_column={sort_column} sort_direction={sort_direction} /></th>
                        <th className="th c" style={{ width: "3.5rem" }}><SortableHeader column="client_error_count" label="4xx" sort_column={sort_column} sort_direction={sort_direction} /></th>
                        <th className="th c" style={{ width: "3.5rem" }}><SortableHeader column="server_error_count" label="5xx" sort_column={sort_column} sort_direction={sort_direction} /></th>
                      </tr>
                    </thead>
                    <tbody id="endpoints-tbody">
                      {endpoints.map((ep, i) => (
                        <tr key={`${ep.route}:${i}`} className="row" onClick={() => selectEndpoint(ep)}>
                          <td className="cell">
                            <span className="method-pill" style={{ background: `${methodColor(ep.method)}15`, color: methodColor(ep.method) }}>{ep.method}</span>
                            <span className="route-path">{ep.route?.replace(/^(GET|POST|PATCH|PUT|DELETE)\s/, "") || ep.route}</span>
                          </td>
                          <td className="cell num">{ep.total}</td>
                          <td className="cell num">{fmt(ep.avg_duration)}</td>
                          <td className={`cell num${ep.p95_duration > 500 ? " warn" : ""}`}>{fmt(ep.p95_duration)}</td>
                          <td className={`cell num${ep.max_duration > 1000 ? " slow" : ""}`}>{fmt(ep.max_duration)}</td>
                          <td className="cell num c">{ep.ok_count}</td>
                          <td className={`cell num c${ep.client_error_count > 0 ? " warn" : ""}`}>{ep.client_error_count}</td>
                          <td className={`cell num c${ep.server_error_count > 0 ? " err" : ""}`}>{ep.server_error_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </InfiniteScroll>
              )}
            </div>
          </>
        )}
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={sheetTitle} aiContext={sheetAi}>
        {sheetItem && (
          <div className="dl-sheet-detail">
            {sheetType === "endpoint" ? (
              <dl className="dl-dl">
                <div className="dl-dl-row"><dt>Route</dt><dd>{sheetItem.route}</dd></div>
                <div className="dl-dl-row"><dt>Requests</dt><dd>{sheetItem.total}</dd></div>
                <div className="dl-dl-row"><dt>Avg Duration</dt><dd>{fmt(sheetItem.avg_duration)}</dd></div>
                <div className="dl-dl-row"><dt>P95 Duration</dt><dd className={sheetItem.p95_duration > 500 ? "warn" : ""}>{fmt(sheetItem.p95_duration)}</dd></div>
                <div className="dl-dl-row"><dt>Max Duration</dt><dd className={sheetItem.max_duration > 1000 ? "slow" : ""}>{fmt(sheetItem.max_duration)}</dd></div>
                <div className="dl-dl-row"><dt>Avg DB</dt><dd>{fmt(sheetItem.avg_db_duration)}</dd></div>
                <div className="dl-dl-row"><dt>Avg Queries</dt><dd>{Math.round(sheetItem.avg_query_count)}</dd></div>
                <div className="dl-dl-row"><dt>2xx</dt><dd>{sheetItem.ok_count}</dd></div>
                <div className="dl-dl-row"><dt>4xx</dt><dd className={sheetItem.client_error_count > 0 ? "warn" : ""}>{sheetItem.client_error_count}</dd></div>
                <div className="dl-dl-row"><dt>5xx</dt><dd className={sheetItem.server_error_count > 0 ? "err" : ""}>{sheetItem.server_error_count}</dd></div>
              </dl>
            ) : (
              <>
                <dl className="dl-dl">
                  <div className="dl-dl-row">
                    <dt>Method</dt>
                    <dd><span className="method-pill" style={{ background: `${methodColor(sheetItem.method)}15`, color: methodColor(sheetItem.method) }}>{sheetItem.method}</span></dd>
                  </div>
                  <div className="dl-dl-row"><dt>Path</dt><dd className="dl-mono">{sheetItem.path}</dd></div>
                  <div className="dl-dl-row"><dt>Controller</dt><dd>{sheetItem.controller_action}</dd></div>
                  <div className="dl-dl-row">
                    <dt>Status</dt>
                    <dd><Badge variant={statusBadgeVariant(sheetItem.status_code)}>{sheetItem.status_code}</Badge></dd>
                  </div>
                  <div className="dl-dl-row"><dt>Duration</dt><dd className={sheetItem.duration_ms > 500 ? "slow" : ""}>{fmt(sheetItem.duration_ms)}</dd></div>
                  <div className="dl-dl-row"><dt>DB Time</dt><dd>{fmt(sheetItem.db_duration_ms)}</dd></div>
                  <div className="dl-dl-row"><dt>View Time</dt><dd>{fmt(sheetItem.view_duration_ms)}</dd></div>
                  <div className="dl-dl-row"><dt>Queries</dt><dd>{sheetItem.query_count}</dd></div>
                  <div className="dl-dl-row"><dt>IP</dt><dd>{sheetItem.ip}</dd></div>
                  <div className="dl-dl-row"><dt>Time</dt><dd>{formatTime(sheetItem.occurred_at)}</dd></div>
                </dl>
                {sheetItem.waterfall?.length > 0 ? (
                  <>
                    <h4 className="sheet-sub">Request Timeline ({sheetItem.waterfall.length} events)</h4>
                    <div className="waterfall">
                      {sheetItem.waterfall.map((evt, i) => (
                        <div key={i} className="wf-item">
                          <div className={`wf-type-badge wf-type-${evt.type}`}>{evt.type}</div>
                          <div className="wf-detail">
                            <span className="wf-text">{evt.detail}</span>
                            {evt.duration_ms && (
                              <span className={`wf-duration${evt.duration_ms > 100 ? " wf-slow" : ""}`}>{fmt(evt.duration_ms)}</span>
                            )}
                          </div>
                          {evt.status_code && <Badge variant={statusBadgeVariant(evt.status_code)}>{evt.status_code}</Badge>}
                          {evt.type === "cache" && <Badge variant={evt.hit ? "default" : "secondary"}>{evt.hit ? "HIT" : "MISS"}</Badge>}
                          {evt.type === "log" && <Badge variant={levelVariant(evt.level)} className={`wf-log-level wf-level-${evt.level}`}>{evt.level}</Badge>}
                        </div>
                      ))}
                    </div>
                  </>
                ) : sheetItem.queries?.length > 0 ? (
                  <>
                    <h4 className="sheet-sub">Query Timeline ({sheetItem.queries.length})</h4>
                    <div className="timeline">
                      {sheetItem.queries.map((q) => (
                        <div key={q.id} className="tl-item">
                          <div className="tl-bar" style={{ width: `${Math.max(Math.min((q.duration_ms / sheetItem.duration_ms) * 100, 100), 3)}%` }} />
                          <div className="tl-info">
                            <span className={`tl-duration${q.duration_ms > 100 ? " slow" : ""}`}>{fmt(q.duration_ms)}</span>
                            <span className="tl-source">{q.source_location || ""}</span>
                          </div>
                          <pre className="tl-sql">{q.sql}</pre>
                        </div>
                      ))}
                    </div>
                  </>
                ) : sheetItem.query_count > 0 ? (
                  <p className="sheet-hint">{sheetItem.query_count} queries ran but none exceeded the slow threshold.</p>
                ) : null}
              </>
            )}
          </div>
        )}
      </EwSheet>
    </DaylightLayout>
  );
}

function levelVariant(l) {
  if (l === "error" || l === "fatal") return "destructive";
  if (l === "warn") return "secondary";
  return "outline";
}

import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import DaylightLayout from "../DaylightLayout";
import PeriodSelect from "../PeriodSelect";
import EwSheet from "../errors/EwSheet";
import BarList from "@/components/charts/BarList";
import InteractiveBarChart from "@/components/charts/InteractiveBarChart";
import { ExportButton } from "@/components/ui/export-button";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

  function changePeriod(p) {
    router.get(`${base}/queries`, { period: p }, { preserveState: true });
  }

  function openQuery(q) { setSheetItem(q); setSheetOpen(true); }

  const sheetAiContext = sheetItem
    ? `SQL Query (slow):\n${sheetItem.sql || sheetItem.normalized_sql}\n\nDuration: ${fmt(sheetItem.duration_ms || sheetItem.avg_duration)}\nMax: ${fmt(sheetItem.max_duration || sheetItem.duration_ms)}\nSource: ${sheetItem.source_location || "unknown"}\nController: ${sheetItem.controller_action || "N/A"}\nPath: ${sheetItem.request_path || "N/A"}\nOccurrences: ${sheetItem.total || 1}`
    : "";

  return (
    <DaylightLayout>
      <div className="dl-page">
        <div className="dl-page-header">
          <div>
            <h1 className="dl-page-title">Slow Queries</h1>
            <p className="dl-page-subtitle">Queries exceeding 50ms threshold in the last {period}</p>
          </div>
          <div className="header-controls">
            <ExportButton baseUrl={`${base}/queries/export`} />
            <PeriodSelect value={period} onChange={changePeriod} />
          </div>
        </div>

        <div className="dl-stat-grid">
          <div className="stat-card">
            <span className="stat-card-label">Total Slow Queries</span>
            <span className="stat-card-value">{total_queries.toLocaleString()}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Unique Patterns</span>
            <span className="stat-card-value">{queries.length.toLocaleString()}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Avg Duration</span>
            <span className="stat-card-value">{fmt(avgDuration)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-label">Slowest Query</span>
            <span className="stat-card-value" style={{ color: "var(--color-danger)" }}>{fmt(maxDuration)}</span>
          </div>
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

        {n_plus_one_requests.length > 0 && (
          <div className="n-plus-one-section">
            <div className="n-plus-one-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <h3 className="n-plus-one-title">N+1 Query Suspects</h3>
            </div>
            <div className="n-plus-one-table">
              <div className="np1-thead">
                <div className="np1-th" style={{ flex: 2 }}>Path</div>
                <div className="np1-th" style={{ flex: 1.5 }}>Controller</div>
                <div className="np1-th np1-th-right" style={{ width: "5rem" }}>Query Count</div>
                <div className="np1-th np1-th-right" style={{ width: "5rem" }}>When</div>
              </div>
              {n_plus_one_requests.map((np, i) => (
                <div key={`${np.path}:${i}`} className="np1-row">
                  <div className="np1-td" style={{ flex: 2 }}>
                    <Badge variant="secondary" className="np1-warning-badge">N+1</Badge>
                    <span className="np1-path">{np.path}</span>
                  </div>
                  <div className="np1-td" style={{ flex: 1.5 }}>
                    <span className="np1-controller">{np.controller_action || "—"}</span>
                  </div>
                  <div className="np1-td np1-td-num" style={{ width: "5rem" }}>{np.query_count}</div>
                  <div className="np1-td np1-td-num" style={{ width: "5rem" }}>
                    <span className="np1-time">{timeAgo(np.occurred_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {topQueries.length > 0 && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-sm">Slowest Query Patterns</CardTitle>
              <span className="dl-card-subtitle">Top 5 by average duration</span>
            </CardHeader>
            <CardContent>
              <BarList items={topQueries} color="#ef4444" valueFormatter={fmt} maxItems={5} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm">Query Patterns</CardTitle>
            <span className="dl-card-subtitle">{queries.length} unique patterns</span>
          </CardHeader>
          <div className="dl-data-table">
            {queries.length === 0 ? (
              <div className="dl-table-empty">
                <svg width="24" height="24" fill="none" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-3-3.87M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21v-2a4 4 0 0 1 4-4h1"/><circle cx="17" cy="8" r="4"/></svg>
                <span>No slow queries recorded in this period.</span>
              </div>
            ) : (
              <InfiniteScroll data="queries" itemsElement="#queries-tbody" startElement="#queries-thead">
                <table className="dl-table">
                  <thead id="queries-thead">
                    <tr>
                      <th style={{ flex: 3 }}>Query</th>
                      <th style={{ width: "4rem", textAlign: "right" }}>
                        <SortableHeader column="total" label="Count" sort_column={sort_column} sort_direction={sort_direction} />
                      </th>
                      <th style={{ width: "5rem", textAlign: "right" }}>
                        <SortableHeader column="avg_duration" label="Avg" sort_column={sort_column} sort_direction={sort_direction} />
                      </th>
                      <th style={{ width: "5rem", textAlign: "right" }}>
                        <SortableHeader column="max_duration" label="Max" sort_column={sort_column} sort_direction={sort_direction} />
                      </th>
                      <th style={{ flex: 1 }}>Source</th>
                    </tr>
                  </thead>
                  <tbody id="queries-tbody">
                    {queries.map((q, i) => (
                      <tr key={`${q.normalized_sql}:${i}`} className="row" onClick={() => openQuery(q)} style={{ cursor: "pointer" }}>
                        <td className="cell td-sql" style={{ flex: 3 }}>
                          <span className="sql-text">{q.normalized_sql}</span>
                        </td>
                        <td className="cell num" style={{ width: "4rem" }}>{q.total}</td>
                        <td className={`cell num${q.avg_duration > 200 ? " td-danger" : ""}`} style={{ width: "5rem" }}>
                          {fmt(q.avg_duration)}
                        </td>
                        <td className={`cell num${q.max_duration > 500 ? " td-danger" : ""}`} style={{ width: "5rem" }}>
                          {fmt(q.max_duration)}
                        </td>
                        <td className="cell td-source" style={{ flex: 1 }}>{q.source_location || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </InfiniteScroll>
            )}
          </div>
        </Card>

        {slowest.length > 0 && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-sm">Slowest Individual Queries</CardTitle>
              <span className="dl-card-subtitle">Recent worst offenders</span>
            </CardHeader>
            <div className="slowest-list">
              {slowest.map((q) => (
                <Button key={q.id} variant="ghost" className="slowest-item w-full justify-start h-auto rounded-none" onClick={() => { setSheetItem(q); setSheetOpen(true); }}>
                  <div className="slowest-left">
                    <span className="slowest-duration">{fmt(q.duration_ms)}</span>
                    <span className="slowest-source">{q.source_location || "—"}</span>
                  </div>
                  <div className="slowest-right">
                    <span className="slowest-action">{q.controller_action}</span>
                    <span className="slowest-time">{timeAgo(q.occurred_at)}</span>
                  </div>
                </Button>
              ))}
            </div>
          </Card>
        )}
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Query Detail" aiContext={sheetAiContext}>
        {sheetItem && (
          <div className="dl-sheet-detail">
            <dl className="dl-dl">
              {sheetItem.controller_action && <div className="dl-dl-row"><dt>Controller</dt><dd>{sheetItem.controller_action}</dd></div>}
              {sheetItem.request_path && <div className="dl-dl-row"><dt>Path</dt><dd className="dl-mono">{sheetItem.request_path}</dd></div>}
              {sheetItem.source_location && <div className="dl-dl-row"><dt>Source</dt><dd className="dl-mono">{sheetItem.source_location}</dd></div>}
              <div className="dl-dl-row">
                <dt>Duration</dt>
                <dd className={(sheetItem.duration_ms > 200 || sheetItem.avg_duration > 200) ? "td-danger" : ""}>
                  {fmt(sheetItem.duration_ms || sheetItem.avg_duration)}
                </dd>
              </div>
              {sheetItem.max_duration && (
                <div className="dl-dl-row">
                  <dt>Max</dt>
                  <dd className={sheetItem.max_duration > 500 ? "td-danger" : ""}>{fmt(sheetItem.max_duration)}</dd>
                </div>
              )}
              {sheetItem.total && <div className="dl-dl-row"><dt>Occurrences</dt><dd>{sheetItem.total}</dd></div>}
            </dl>
            <h4 className="sheet-sub">SQL</h4>
            <pre className="sheet-sql">{sheetItem.sql || sheetItem.normalized_sql}</pre>
          </div>
        )}
      </EwSheet>
    </DaylightLayout>
  );
}

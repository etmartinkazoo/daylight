import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import DaylightLayout from "../DaylightLayout";
import PeriodSelect from "../PeriodSelect";
import EwSheet from "../errors/EwSheet";
import AreaChart from "@/components/charts/AreaChart";
import DonutChart from "@/components/charts/DonutChart";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { fmt } from "@/lib/formatters.js";

function patternHitRateClass(rate) {
  if (rate == null) return "";
  if (rate >= 90) return "rate-ok";
  if (rate >= 70) return "rate-warn";
  return "rate-danger";
}

export default function CacheIndex({
  key_groups = [], period = "24h", total_events = 0,
  hit_rate = 0, total_reads = 0, total_hits = 0,
  volume_series = [], base_path: base = "/daylight",
  sort_column = null, sort_direction = null,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState(null);

  const hitRateDisplay = `${hit_rate.toFixed(1)}%`;
  const hitRateClass = hit_rate >= 90 ? "dl-stat-ok" : hit_rate >= 70 ? "dl-stat-warn" : "dl-stat-danger";
  const misses = total_reads - total_hits;

  const donutSegments = [
    { value: total_hits, color: "#22c55e", label: "Hits" },
    { value: misses, color: "#ef4444", label: "Misses" },
  ].filter((s) => s.value > 0);

  const sheetAi = sheetItem
    ? `Cache Key Pattern: ${sheetItem.key_pattern}\nReads: ${sheetItem.reads}\nHit Rate: ${sheetItem.hit_rate != null ? sheetItem.hit_rate.toFixed(1) + "%" : "N/A"}\nAvg Duration: ${fmt(sheetItem.avg_duration)}`
    : "";

  function changePeriod(p) { router.get(`${base}/cache`, { period: p }, { preserveState: true }); }
  function openPattern(p) { setSheetItem(p); setSheetOpen(true); }

  return (
    <DaylightLayout>
      <div className="dl-page">
        <div className="dl-page-header">
          <div>
            <h1 className="dl-page-title">Cache</h1>
            <p className="dl-page-subtitle">Cache performance and key patterns in the last {period}</p>
          </div>
          <div className="dl-period-selector">
            <PeriodSelect value={period} onChange={changePeriod} />
          </div>
        </div>

        <div className="dl-stat-grid">
          <div className="dl-stat-card">
            <span className="stat-card-label">Hit Rate</span>
            <span className={`stat-card-value ${hitRateClass}`}>{hitRateDisplay}</span>
          </div>
          <div className="dl-stat-card">
            <span className="stat-card-label">Total Reads</span>
            <span className="stat-card-value">{total_reads.toLocaleString()}</span>
          </div>
          <div className="dl-stat-card">
            <span className="stat-card-label">Cache Hits</span>
            <span className="stat-card-value">{total_hits.toLocaleString()}</span>
          </div>
          <div className="dl-stat-card">
            <span className="stat-card-label">Total Events</span>
            <span className="stat-card-value">{total_events.toLocaleString()}</span>
          </div>
        </div>

        <div className="dl-charts-row">
          {(total_hits + misses) > 0 && (
            <Card className="chart-card-donut">
              <CardHeader className="border-b">
                <CardTitle className="text-sm">Hits vs Misses</CardTitle>
              </CardHeader>
              <CardContent className="card-body-center">
                <DonutChart segments={donutSegments} size={110} strokeWidth={12} centerValue={hitRateDisplay} centerLabel="hit rate" />
              </CardContent>
            </Card>
          )}
          {volume_series.length >= 2 && (
            <Card className="chart-card-volume">
              <CardHeader className="border-b">
                <CardTitle className="text-sm">Cache Event Volume</CardTitle>
                <span className="dl-card-subtitle">Over time</span>
              </CardHeader>
              <CardContent>
                <AreaChart data={volume_series} width={420} height={80} color="#8b5cf6" />
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm">Key Patterns</CardTitle>
            <span className="dl-card-subtitle">{key_groups.length} patterns</span>
          </CardHeader>
          <div className="dl-data-table">
            {key_groups.length === 0 ? (
              <div className="dl-table-empty">
                <svg width="24" height="24" fill="none" stroke="#94a3b8" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>No cache events recorded in this period.</span>
              </div>
            ) : (
              <InfiniteScroll data="key_groups" itemsElement="#cache-tbody" startElement="#cache-thead">
                <table className="dl-table">
                  <thead id="cache-thead">
                    <tr>
                      <th style={{ flex: 3 }}>Key Pattern</th>
                      <th style={{ width: "5rem", textAlign: "right" }}><SortableHeader column="reads" label="Reads" sort_column={sort_column} sort_direction={sort_direction} /></th>
                      <th style={{ width: "5.5rem", textAlign: "right" }}>Hit Rate</th>
                      <th style={{ width: "5rem", textAlign: "right" }}><SortableHeader column="avg_duration" label="Avg" sort_column={sort_column} sort_direction={sort_direction} /></th>
                    </tr>
                  </thead>
                  <tbody id="cache-tbody">
                    {key_groups.map((p, i) => (
                      <tr key={`${p.key_pattern}:${i}`} className="row" onClick={() => openPattern(p)} style={{ cursor: "pointer" }}>
                        <td className="cell td-key" style={{ flex: 3 }}>
                          <span className="key-text">{p.key_pattern}</span>
                        </td>
                        <td className="cell num" style={{ width: "5rem" }}>{p.reads}</td>
                        <td className="cell num" style={{ width: "5.5rem" }}>
                          <span className={patternHitRateClass(p.hit_rate)}>
                            {p.hit_rate != null ? `${p.hit_rate.toFixed(1)}%` : "—"}
                          </span>
                        </td>
                        <td className="cell num" style={{ width: "5rem" }}>{fmt(p.avg_duration)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </InfiniteScroll>
            )}
          </div>
        </Card>
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Cache Pattern Detail" aiContext={sheetAi}>
        {sheetItem && (
          <div className="dl-sheet-detail">
            <dl className="dl-dl">
              <div className="dl-dl-row"><dt>Key Pattern</dt><dd className="dl-mono">{sheetItem.key_pattern}</dd></div>
              <div className="dl-dl-row"><dt>Reads</dt><dd>{sheetItem.reads}</dd></div>
              <div className="dl-dl-row">
                <dt>Hit Rate</dt>
                <dd className={patternHitRateClass(sheetItem.hit_rate)}>
                  {sheetItem.hit_rate != null ? `${sheetItem.hit_rate.toFixed(1)}%` : "—"}
                </dd>
              </div>
              <div className="dl-dl-row"><dt>Avg Duration</dt><dd>{fmt(sheetItem.avg_duration)}</dd></div>
              {sheetItem.max_duration && <div className="dl-dl-row"><dt>Max Duration</dt><dd>{fmt(sheetItem.max_duration)}</dd></div>}
              {sheetItem.total && <div className="dl-dl-row"><dt>Total Events</dt><dd>{sheetItem.total}</dd></div>}
            </dl>
          </div>
        )}
      </EwSheet>
    </DaylightLayout>
  );
}

import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import DaylightLayout from "../DaylightLayout";
import PeriodSelect from "../PeriodSelect";
import EwSheet from "../errors/EwSheet";
import DonutChart from "@/components/charts/DonutChart";
import InteractiveBarChart from "@/components/charts/InteractiveBarChart";
import { ExportButton } from "@/components/ui/export-button";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmt, timeAgo, formatTime } from "@/lib/formatters.js";

export default function JobsIndex({
  job_classes = [], failures = [], period = "24h", totals = {}, solid_queue = null,
  volume_series = [], failure_series = [],
  base_path: base = "/daylight", sort_column = null, sort_direction = null,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState(null);
  const [sheetType, setSheetType] = useState("class");

  const avgDuration = job_classes.length > 0
    ? job_classes.reduce((s, j) => s + (j.avg_duration || 0), 0) / job_classes.length
    : 0;

  const donutSegments = [
    { value: totals.completed || 0, color: "#22c55e", label: "Completed" },
    { value: totals.failed || 0, color: "#ef4444", label: "Failed" },
    { value: (totals.total || 0) - (totals.completed || 0) - (totals.failed || 0), color: "#3b82f6", label: "Other" },
  ].filter((s) => s.value > 0);

  const completionPct = totals.total > 0
    ? Math.round(((totals.completed || 0) / totals.total) * 100)
    : 0;

  const jobChartData = volume_series.map((d, i) => ({
    t: d.t, total: d.v, failed: failure_series[i]?.v || 0,
  }));

  function changePeriod(p) { router.get(`${base}/jobs`, { period: p }, { preserveState: true }); }
  function openClass(jc) { setSheetItem(jc); setSheetType("class"); setSheetOpen(true); }
  function openFailure(f) { setSheetItem(f); setSheetType("failure"); setSheetOpen(true); }
  function openSqStat(label, items) { setSheetItem({ label, items }); setSheetType("sq_stat"); setSheetOpen(true); }

  const sheetTitle = sheetType === "sq_stat"
    ? (sheetItem?.label || "Jobs")
    : sheetType === "class"
    ? (sheetItem?.job_class || "Job")
    : `Failed: ${sheetItem?.job_class || "Job"}`;

  const sheetAi = (() => {
    if (!sheetItem) return "";
    if (sheetType === "class") return `Job Class: ${sheetItem.job_class}\nTotal: ${sheetItem.total}\nCompleted: ${sheetItem.completed_count}\nFailed: ${sheetItem.failed_count}\nQueued: ${sheetItem.queued_count}\nAvg duration: ${fmt(sheetItem.avg_duration)}\nMax duration: ${fmt(sheetItem.max_duration)}`;
    if (sheetType === "failure") return `Failed Job: ${sheetItem.job_class}\nQueue: ${sheetItem.queue || "default"}\nError: ${sheetItem.error_class}\nMessage: ${sheetItem.error_message}\nFailed at: ${sheetItem.occurred_at}`;
    return `${sheetItem.label}: ${sheetItem.items?.length || 0} items`;
  })();

  return (
    <DaylightLayout>
      <div className="dl-page">
        <div className="dl-page-header">
          <div>
            <h1 className="dl-page-title">Jobs</h1>
            <p className="dl-page-subtitle">Background job monitoring and performance</p>
          </div>
          <div className="header-controls">
            <ExportButton baseUrl={`${base}/jobs/export`} />
            <PeriodSelect value={period} onChange={changePeriod} />
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-cards">
            <div className="stat-card"><span className="stat-card-label">Total Jobs</span><span className="stat-card-value">{totals.total || 0}</span></div>
            <div className="stat-card"><span className="stat-card-label">Completed</span><span className="stat-card-value" style={{ color: "#22c55e" }}>{totals.completed || 0}</span></div>
            <div className={`stat-card${totals.failed > 0 ? " stat-card-danger" : ""}`}>
              <span className="stat-card-label">Failed</span>
              <span className="stat-card-value">{totals.failed || 0}</span>
            </div>
            <div className="stat-card"><span className="stat-card-label">Avg Duration</span><span className="stat-card-value">{fmt(avgDuration)}</span></div>
          </div>
          {(totals.total || 0) > 0 && (
            <div className="chart-card">
              <DonutChart segments={donutSegments} size={110} strokeWidth={12} centerValue={`${completionPct}%`} centerLabel="complete" />
            </div>
          )}
        </div>

        {volume_series.length > 0 && (
          <InteractiveBarChart
            data={jobChartData}
            series={[
              { key: "total", label: "Total Jobs", color: "#3b82f6" },
              { key: "failed", label: "Failed", color: "#ef4444" },
            ]}
            title="Job Volume"
            description="Job execution over time"
            height={250}
          />
        )}

        {solid_queue && (
          <div className="section">
            <h2 className="section-title">Solid Queue</h2>
            <div className="sq-cards">
              <Button variant="outline" className="sq-card" onClick={() => openSqStat("Ready Jobs", solid_queue.ready_jobs)}>
                <span className="sq-card-value">{solid_queue.ready}</span>
                <span className="sq-card-label">Ready</span>
              </Button>
              <Button variant="outline" className="sq-card" onClick={() => openSqStat("Scheduled Jobs", solid_queue.scheduled_jobs)}>
                <span className="sq-card-value">{solid_queue.scheduled}</span>
                <span className="sq-card-label">Scheduled</span>
              </Button>
              <Button variant="outline" className="sq-card" onClick={() => openSqStat("Running Jobs", solid_queue.claimed_jobs)}>
                <span className="sq-card-value">{solid_queue.claimed}</span>
                <span className="sq-card-label">Running</span>
              </Button>
              <Button variant={solid_queue.failed > 0 ? "destructive" : "outline"} className="sq-card" onClick={() => {}}>
                <span className="sq-card-value">{solid_queue.failed}</span>
                <span className="sq-card-label">Failed</span>
              </Button>
              <Button variant="outline" className="sq-card" onClick={() => openSqStat("Worker Processes", solid_queue.worker_processes)}>
                <span className="sq-card-value">{solid_queue.processes}</span>
                <span className="sq-card-label">Workers</span>
              </Button>
            </div>
          </div>
        )}

        {job_classes.length > 0 && (
          <div className="section">
            <h2 className="section-title">Job Classes</h2>
            <div className="dl-data-table">
              <InfiniteScroll data="job_classes" itemsElement="#jobs-tbody" startElement="#jobs-thead">
                <table className="dl-table">
                  <thead id="jobs-thead">
                    <tr>
                      <th style={{ flex: 2 }}>Job Class</th>
                      <th style={{ width: "4rem", textAlign: "right" }}><SortableHeader column="total" label="Total" sort_column={sort_column} sort_direction={sort_direction} /></th>
                      <th style={{ width: "4.5rem", textAlign: "right" }}><SortableHeader column="completed_count" label="Done" sort_column={sort_column} sort_direction={sort_direction} /></th>
                      <th style={{ width: "4rem", textAlign: "right" }}><SortableHeader column="failed_count" label="Failed" sort_column={sort_column} sort_direction={sort_direction} /></th>
                      <th style={{ width: "4.5rem", textAlign: "right" }}>Queued</th>
                      <th style={{ width: "5rem", textAlign: "right" }}><SortableHeader column="avg_duration" label="Avg" sort_column={sort_column} sort_direction={sort_direction} /></th>
                      <th style={{ width: "5rem", textAlign: "right" }}><SortableHeader column="max_duration" label="Max" sort_column={sort_column} sort_direction={sort_direction} /></th>
                    </tr>
                  </thead>
                  <tbody id="jobs-tbody">
                    {job_classes.map((jc, i) => (
                      <tr key={`${jc.job_class}:${i}`} className="row" onClick={() => openClass(jc)} style={{ cursor: "pointer" }}>
                        <td className="cell" style={{ flex: 2 }}><span className="job-name">{jc.job_class}</span></td>
                        <td className="cell num" style={{ width: "4rem" }}>{jc.total}</td>
                        <td className="cell num completed" style={{ width: "4.5rem" }}>{jc.completed_count}</td>
                        <td className={`cell num${jc.failed_count > 0 ? " failed-val" : ""}`} style={{ width: "4rem" }}>{jc.failed_count}</td>
                        <td className="cell num" style={{ width: "4.5rem" }}>{jc.queued_count}</td>
                        <td className="cell num" style={{ width: "5rem" }}>{fmt(jc.avg_duration)}</td>
                        <td className={`cell num${jc.max_duration > 10000 ? " slow-val" : ""}`} style={{ width: "5rem" }}>{fmt(jc.max_duration)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </InfiniteScroll>
            </div>
          </div>
        )}

        {failures.length > 0 ? (
          <div className="section">
            <div className="section-title-row">
              <h2 className="section-title">Recent Failures</h2>
              <span className="failure-count">{failures.length}</span>
            </div>
            <div className="dl-data-table">
              <div className="dl-table-header">
                <div className="dl-th" style={{ flex: 1.5 }}>Job</div>
                <div className="dl-th" style={{ flex: 1 }}>Error</div>
                <div className="dl-th" style={{ width: "5rem" }}>Queue</div>
                <div className="dl-th dl-th-right" style={{ width: "5.5rem" }}>When</div>
              </div>
              {failures.map((f) => (
                <Button key={f.id} variant="ghost" className="dl-table-row failure-row w-full justify-start h-auto rounded-none" onClick={() => openFailure(f)}>
                  <div className="dl-td" style={{ flex: 1.5 }}><span className="fail-job">{f.job_class || "Unknown"}</span></div>
                  <div className="dl-td" style={{ flex: 1 }}><span className="fail-error">{f.error_class || "—"}</span></div>
                  <div className="dl-td" style={{ width: "5rem" }}>
                    <Badge variant="secondary">{f.queue || "—"}</Badge>
                  </div>
                  <div className="dl-td dl-th-right" style={{ width: "5.5rem" }}><span className="fail-time">{timeAgo(f.occurred_at)}</span></div>
                </Button>
              ))}
            </div>
          </div>
        ) : job_classes.length === 0 ? (
          <div className="dl-table-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            <p>No job data yet</p>
            <p>Jobs will appear here once they start running.</p>
          </div>
        ) : null}
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={sheetTitle} aiContext={sheetAi}>
        {sheetItem && (
          <div className="dl-sheet-detail">
            {sheetType === "sq_stat" ? (
              <>
                <p className="sheet-count">{sheetItem.items?.length || 0} item{sheetItem.items?.length === 1 ? "" : "s"}</p>
                {sheetItem.items?.length > 0 ? (
                  <div className="sq-list">
                    {sheetItem.items.map((item) => (
                      <div key={item.id} className="sq-list-row">
                        <span className="sq-list-class">{item.job_class || item.kind || "—"}</span>
                        {item.queue && <span className="sq-list-queue">{item.queue}</span>}
                        {item.hostname && <span className="sq-list-host">{item.hostname}:{item.pid}</span>}
                        <span className="sq-list-time">
                          {item.scheduled_at ? formatTime(item.scheduled_at)
                            : item.claimed_at ? formatTime(item.claimed_at)
                            : item.last_heartbeat_at ? `heartbeat: ${timeAgo(item.last_heartbeat_at)}`
                            : item.created_at ? formatTime(item.created_at)
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="sheet-empty">No items</p>
                )}
              </>
            ) : sheetType === "class" ? (
              <dl className="dl-dl">
                <div className="dl-dl-row"><dt>Job Class</dt><dd>{sheetItem.job_class}</dd></div>
                <div className="dl-dl-row"><dt>Total</dt><dd>{sheetItem.total}</dd></div>
                <div className="dl-dl-row"><dt>Completed</dt><dd className="ok">{sheetItem.completed_count}</dd></div>
                <div className="dl-dl-row"><dt>Failed</dt><dd className={sheetItem.failed_count > 0 ? "err" : ""}>{sheetItem.failed_count}</dd></div>
                <div className="dl-dl-row"><dt>Queued</dt><dd>{sheetItem.queued_count}</dd></div>
                <div className="dl-dl-row"><dt>Avg Duration</dt><dd>{fmt(sheetItem.avg_duration)}</dd></div>
                <div className="dl-dl-row"><dt>Max Duration</dt><dd className={sheetItem.max_duration > 10000 ? "slow" : ""}>{fmt(sheetItem.max_duration)}</dd></div>
              </dl>
            ) : (
              <>
                <dl className="dl-dl">
                  <div className="dl-dl-row"><dt>Job Class</dt><dd>{sheetItem.job_class}</dd></div>
                  <div className="dl-dl-row"><dt>Queue</dt><dd>{sheetItem.queue || "—"}</dd></div>
                  {sheetItem.duration_ms && <div className="dl-dl-row"><dt>Duration</dt><dd>{fmt(sheetItem.duration_ms)}</dd></div>}
                  <div className="dl-dl-row"><dt>Failed At</dt><dd>{formatTime(sheetItem.occurred_at)}</dd></div>
                  <div className="dl-dl-row"><dt>Error Class</dt><dd className="err">{sheetItem.error_class || "—"}</dd></div>
                  <div className="dl-dl-row"><dt>Source</dt><dd className="source-badge">{sheetItem.source === "solid_queue" ? "Solid Queue" : "Daylight"}</dd></div>
                </dl>
                {sheetItem.error_message && (
                  <>
                    <h4 className="sheet-sub">Error Message</h4>
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

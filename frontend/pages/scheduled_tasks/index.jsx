import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import DaylightLayout from "../DaylightLayout";
import PeriodSelect from "../PeriodSelect";
import EwSheet from "../errors/EwSheet";
import InteractiveBarChart from "@/components/charts/InteractiveBarChart";
import { ExportButton } from "@/components/ui/export-button";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Button } from "@/components/ui/button";
import { fmt, timeAgo, formatTime } from "@/lib/formatters.js";

export default function ScheduledTasksIndex({
  task_classes = [], failures = [], totals = {}, period = "24h",
  volume_series = [], failure_series = [],
  base_path: base = "/daylight", sort_column = null, sort_direction = null,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState(null);
  const [sheetType, setSheetType] = useState("class");

  const avgDuration = task_classes.length > 0
    ? task_classes.reduce((s, t) => s + (t.avg_duration || 0), 0) / task_classes.length
    : 0;

  const sheetTitle = sheetType === "class"
    ? (sheetItem?.task_class || "Task")
    : `Failed: ${sheetItem?.task_class || "Task"}`;

  const sheetAi = (() => {
    if (!sheetItem) return "";
    if (sheetType === "class") return `Task Class: ${sheetItem.task_class}\nTotal: ${sheetItem.total}\nCompleted: ${sheetItem.completed_count}\nFailed: ${sheetItem.failed_count}\nAvg duration: ${fmt(sheetItem.avg_duration)}\nMax duration: ${fmt(sheetItem.max_duration)}`;
    return `Failed Task: ${sheetItem.task_class}\nError: ${sheetItem.error_class}\nMessage: ${sheetItem.error_message}\nFailed at: ${sheetItem.occurred_at}`;
  })();

  function changePeriod(p) { router.get(`${base}/scheduled_tasks`, { period: p }, { preserveState: true }); }
  function openClass(tc) { setSheetItem(tc); setSheetType("class"); setSheetOpen(true); }
  function openFailure(f) { setSheetItem(f); setSheetType("failure"); setSheetOpen(true); }

  const chartData = volume_series.map((d, i) => ({
    t: d.t, total: d.v, failed: failure_series[i]?.v || 0,
  }));

  return (
    <DaylightLayout>
      <div className="dl-page">
        <div className="dl-page-header">
          <div>
            <h1 className="dl-page-title">Scheduled Tasks</h1>
            <p className="dl-page-subtitle">Recurring task monitoring and performance</p>
          </div>
          <div className="header-controls">
            <ExportButton baseUrl={`${base}/scheduled_tasks/export`} />
            <PeriodSelect value={period} onChange={changePeriod} />
          </div>
        </div>

        <div className="dl-stat-grid">
          <div className="stat-card"><span className="stat-card-label">Total Runs</span><span className="stat-card-value">{totals.total || 0}</span></div>
          <div className="stat-card"><span className="stat-card-label">Completed</span><span className="stat-card-value" style={{ color: "#22c55e" }}>{totals.completed || 0}</span></div>
          <div className={`stat-card${totals.failed > 0 ? " stat-card-danger" : ""}`}>
            <span className="stat-card-label">Failed</span>
            <span className="stat-card-value">{totals.failed || 0}</span>
          </div>
          <div className="stat-card"><span className="stat-card-label">Avg Duration</span><span className="stat-card-value">{fmt(avgDuration)}</span></div>
        </div>

        {volume_series.length > 0 && (
          <InteractiveBarChart
            data={chartData}
            series={[
              { key: "total", label: "Total Runs", color: "#3b82f6" },
              { key: "failed", label: "Failed", color: "#ef4444" },
            ]}
            title="Task Volume"
            description="Task execution over time"
            height={250}
          />
        )}

        {task_classes.length > 0 && (
          <div className="section">
            <h2 className="section-title">Task Classes</h2>
            <div className="dl-data-table">
              <InfiniteScroll data="task_classes" itemsElement="#tasks-tbody" startElement="#tasks-thead">
                <table className="dl-table">
                  <thead id="tasks-thead">
                    <tr>
                      <th style={{ flex: 2 }}>Task Class</th>
                      <th style={{ width: "4rem", textAlign: "right" }}><SortableHeader column="total" label="Total" sort_column={sort_column} sort_direction={sort_direction} /></th>
                      <th style={{ width: "4.5rem", textAlign: "right" }}><SortableHeader column="completed_count" label="Done" sort_column={sort_column} sort_direction={sort_direction} /></th>
                      <th style={{ width: "4rem", textAlign: "right" }}><SortableHeader column="failed_count" label="Failed" sort_column={sort_column} sort_direction={sort_direction} /></th>
                      <th style={{ width: "5rem", textAlign: "right" }}><SortableHeader column="avg_duration" label="Avg" sort_column={sort_column} sort_direction={sort_direction} /></th>
                      <th style={{ width: "5rem", textAlign: "right" }}><SortableHeader column="max_duration" label="Max" sort_column={sort_column} sort_direction={sort_direction} /></th>
                    </tr>
                  </thead>
                  <tbody id="tasks-tbody">
                    {task_classes.map((tc, i) => (
                      <tr key={`${tc.task_class}:${i}`} className="row" onClick={() => openClass(tc)} style={{ cursor: "pointer" }}>
                        <td className="cell" style={{ flex: 2 }}><span className="task-name">{tc.task_class}</span></td>
                        <td className="cell num" style={{ width: "4rem" }}>{tc.total}</td>
                        <td className="cell num completed" style={{ width: "4.5rem" }}>{tc.completed_count}</td>
                        <td className={`cell num${tc.failed_count > 0 ? " failed-val" : ""}`} style={{ width: "4rem" }}>{tc.failed_count}</td>
                        <td className="cell num" style={{ width: "5rem" }}>{fmt(tc.avg_duration)}</td>
                        <td className={`cell num${tc.max_duration > 10000 ? " slow-val" : ""}`} style={{ width: "5rem" }}>{fmt(tc.max_duration)}</td>
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
                <div className="dl-th" style={{ flex: 1.5 }}>Task</div>
                <div className="dl-th" style={{ flex: 1 }}>Error</div>
                <div className="dl-th dl-th-right" style={{ width: "5.5rem" }}>When</div>
              </div>
              {failures.map((f) => (
                <Button key={f.id} variant="ghost" className="dl-table-row failure-row w-full justify-start h-auto rounded-none" onClick={() => openFailure(f)}>
                  <div className="dl-td" style={{ flex: 1.5 }}><span className="fail-task">{f.task_class || "Unknown"}</span></div>
                  <div className="dl-td" style={{ flex: 1 }}><span className="fail-error">{f.error_class || "—"}</span></div>
                  <div className="dl-td dl-th-right" style={{ width: "5.5rem" }}><span className="fail-time">{timeAgo(f.occurred_at)}</span></div>
                </Button>
              ))}
            </div>
          </div>
        ) : task_classes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <p className="empty-title">No scheduled task data yet</p>
            <p className="empty-sub">Tasks will appear here once they start running.</p>
          </div>
        ) : null}
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={sheetTitle} aiContext={sheetAi}>
        {sheetItem && (
          <div className="dl-sheet-detail">
            {sheetType === "class" ? (
              <dl className="dl-dl">
                <div className="dl-dl-row"><dt>Task Class</dt><dd>{sheetItem.task_class}</dd></div>
                <div className="dl-dl-row"><dt>Total</dt><dd>{sheetItem.total}</dd></div>
                <div className="dl-dl-row"><dt>Completed</dt><dd className="ok">{sheetItem.completed_count}</dd></div>
                <div className="dl-dl-row"><dt>Failed</dt><dd className={sheetItem.failed_count > 0 ? "err" : ""}>{sheetItem.failed_count}</dd></div>
                <div className="dl-dl-row"><dt>Avg Duration</dt><dd>{fmt(sheetItem.avg_duration)}</dd></div>
                <div className="dl-dl-row"><dt>Max Duration</dt><dd className={sheetItem.max_duration > 10000 ? "slow" : ""}>{fmt(sheetItem.max_duration)}</dd></div>
              </dl>
            ) : (
              <>
                <dl className="dl-dl">
                  <div className="dl-dl-row"><dt>Task Class</dt><dd>{sheetItem.task_class}</dd></div>
                  {sheetItem.duration_ms && <div className="dl-dl-row"><dt>Duration</dt><dd>{fmt(sheetItem.duration_ms)}</dd></div>}
                  <div className="dl-dl-row"><dt>Failed At</dt><dd>{formatTime(sheetItem.occurred_at)}</dd></div>
                  <div className="dl-dl-row"><dt>Error Class</dt><dd className="err">{sheetItem.error_class || "—"}</dd></div>
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

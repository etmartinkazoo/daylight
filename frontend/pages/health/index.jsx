import { useState } from "react";
import DaylightLayout from "../DaylightLayout";
import EwSheet from "../errors/EwSheet";
import DonutChart from "@/components/charts/DonutChart";
import AreaChart from "@/components/charts/AreaChart";
import { formatTimeLong } from "@/lib/formatters.js";
import { Button } from "@/components/ui/button";

export default function HealthIndex({
  system = {}, database = {}, jobs = {}, errors = {}, apdex = null,
  error_sparkline = [], request_sparkline = [], base_path: base = "/daylight",
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetData, setSheetData] = useState(null);

  function openFailure(f) {
    setSheetTitle(f.job_class || "Job Failure");
    setSheetData(f);
    setSheetOpen(true);
  }

  const apdexColor = apdex == null ? "#64748b" : apdex >= 0.9 ? "#22c55e" : apdex >= 0.7 ? "#f59e0b" : "#ef4444";
  const errorChartSegments = [
    { value: errors.open ?? 0, color: "#ef4444", label: "Open" },
    { value: Math.max((errors.total ?? 0) - (errors.open ?? 0), 0), color: "#22c55e", label: "Resolved" },
  ];

  return (
    <DaylightLayout>
      <div className="dl-page">
        <div className="dl-page-header">
          <div>
            <h1 className="dl-page-title">Health Dashboard</h1>
            <p className="dl-page-subtitle">System monitoring and performance overview</p>
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">System Info</h2>
          <div className="card-grid">
            <div className="stat-card">
              <span className="stat-card-label">Environment</span>
              <div className="stat-card-value">
                <span className={`env-badge${system.environment === "production" ? " production" : ""}`}>
                  {system.environment || "—"}
                </span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Ruby Version</span>
              <span className="stat-card-value stat-card-value-sm">{system.ruby_version || "—"}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Rails Version</span>
              <span className="stat-card-value stat-card-value-sm">{system.rails_version || "—"}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Uptime</span>
              <span className="stat-card-value stat-card-value-sm">{system.uptime || "—"}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Memory Usage</span>
              <span className="stat-card-value">{system.memory_mb ? `${system.memory_mb}` : "—"}</span>
              {system.memory_mb && <span className="stat-card-unit">MB</span>}
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Process ID</span>
              <span className="stat-card-value mono">{system.pid || "—"}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Server Time</span>
              <span className="stat-card-value stat-card-value-sm">{formatTimeLong(system.server_time) || "—"}</span>
            </div>
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Database Status</h2>
          <div className="card-grid">
            <div className="stat-card">
              <span className="stat-card-label">Connection</span>
              <div className="stat-card-value">
                <span className="status-indicator">
                  <span className={`status-dot${database.connected ? " connected" : " disconnected"}`} />
                  {database.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Adapter</span>
              <span className="stat-card-value stat-card-value-sm">{database.adapter || "—"}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Tables</span>
              <span className="stat-card-value">{database.tables ?? "—"}</span>
            </div>
            {database.size_mb != null && (
              <div className="stat-card">
                <span className="stat-card-label">App DB Size</span>
                <span className="stat-card-value">{database.size_mb}</span>
                <span className="stat-card-unit">MB</span>
              </div>
            )}
            {database.errorwatch_size_mb != null && (
              <div className="stat-card">
                <span className="stat-card-label">Daylight DB Size</span>
                <span className="stat-card-value">{database.errorwatch_size_mb}</span>
                <span className="stat-card-unit">MB</span>
              </div>
            )}
            {database.error && (
              <div className="stat-card stat-card-error">
                <span className="stat-card-label">Error</span>
                <span className="stat-card-value stat-card-value-sm err-text">{database.error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="section">
          <h2 className="section-title">Performance Overview</h2>
          {apdex != null && (
            <div className="subsection">
              <h3 className="subsection-title">Application Performance</h3>
              <div className="apdex-card" style={{ borderColor: `${apdexColor}20` }}>
                <span className="apdex-label">Apdex Score</span>
                <span className="apdex-value" style={{ color: apdexColor }}>{apdex.toFixed(2)}</span>
                <span className="apdex-desc">
                  {apdex >= 0.9 ? "Excellent" : apdex >= 0.7 ? "Fair" : "Poor"}
                </span>
              </div>
            </div>
          )}

          <div className="subsection">
            <h3 className="subsection-title">Errors</h3>
            <div className="card-grid-with-chart">
              <div className="chart-card">
                <span className="stat-card-label">Error Distribution</span>
                <div className="chart-wrapper">
                  <DonutChart segments={errorChartSegments} size={140} strokeWidth={16} centerValue={String(errors.total ?? 0)} centerLabel="total" />
                </div>
              </div>
              <div className="stat-cards-group">
                <div className={`stat-card${errors.open > 0 ? " stat-card-alert" : ""}`}>
                  <span className="stat-card-label">Open Errors</span>
                  <span className={`stat-card-value${errors.open > 0 ? " err-value" : ""}`}>{errors.open ?? 0}</span>
                  <span className="stat-card-description">Currently unresolved</span>
                  {error_sparkline.length >= 2 && (
                    <div className="sparkline-container"><AreaChart data={error_sparkline} width={120} height={32} color="#ef4444" /></div>
                  )}
                </div>
                <div className="stat-card">
                  <span className="stat-card-label">Last 24 Hours</span>
                  <span className="stat-card-value">{errors.last_24h ?? 0}</span>
                  <span className="stat-card-description">Errors in past day</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card-label">Last 7 Days</span>
                  <span className="stat-card-value">{errors.last_7d ?? 0}</span>
                  <span className="stat-card-description">Errors in past week</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card-label">Total Errors</span>
                  <span className="stat-card-value">{errors.total ?? 0}</span>
                  <span className="stat-card-description">All time</span>
                </div>
              </div>
            </div>
            {errors.open > 0 && (
              <a href={`${base}/errors`} className="action-link">View open errors &rarr;</a>
            )}
          </div>

          <div className="subsection">
            <h3 className="subsection-title">Background Jobs</h3>
            {!jobs.available ? (
              <div className="stat-card">
                <span className="stat-card-label">Status</span>
                <span className="stat-card-value stat-card-value-sm muted-text">Solid Queue not detected</span>
              </div>
            ) : jobs.error ? (
              <div className="stat-card stat-card-error">
                <span className="stat-card-label">Error</span>
                <span className="stat-card-value stat-card-value-sm err-text">{jobs.error}</span>
              </div>
            ) : (
              <>
                <div className="card-grid">
                  <div className="stat-card">
                    <span className="stat-card-label">Ready</span>
                    <span className="stat-card-value">{jobs.ready ?? 0}</span>
                    <span className="stat-card-description">Queued for processing</span>
                    {request_sparkline.length >= 2 && (
                      <div className="sparkline-container"><AreaChart data={request_sparkline} width={120} height={32} color="#3b82f6" /></div>
                    )}
                  </div>
                  <div className="stat-card">
                    <span className="stat-card-label">Scheduled</span>
                    <span className="stat-card-value">{jobs.scheduled ?? 0}</span>
                    <span className="stat-card-description">Waiting to run</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-card-label">Running</span>
                    <span className="stat-card-value">{jobs.claimed ?? 0}</span>
                    <span className="stat-card-description">Currently executing</span>
                  </div>
                  <div className={`stat-card${jobs.failed > 0 ? " stat-card-alert" : ""}`}>
                    <span className="stat-card-label">Failed</span>
                    <span className={`stat-card-value${jobs.failed > 0 ? " err-value" : ""}`}>{jobs.failed ?? 0}</span>
                    <span className="stat-card-description">Requires attention</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-card-label">Processes</span>
                    <span className="stat-card-value">{jobs.processes ?? 0}</span>
                    <span className="stat-card-description">Active workers</span>
                  </div>
                </div>
                {jobs.recent_failures?.length > 0 && (
                  <div className="failures-section">
                    <h4 className="failures-title">Recent Failures</h4>
                    <div className="failures-list">
                      {jobs.recent_failures.map((f) => (
                        <Button key={f.id} variant="ghost" className="failure-row w-full justify-start h-auto py-2 px-3 text-left" onClick={() => openFailure(f)}>
                          <div className="failure-main">
                            <span className="failure-job">{f.job_class || "Unknown"}</span>
                            <span className="failure-time">{formatTimeLong(f.failed_at)}</span>
                          </div>
                          <span className="failure-err">{f.error_class}: {f.error_message}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={sheetTitle}>
        {sheetData && (
          <div className="dl-sheet-detail">
            <dl className="dl-dl">
              <div className="dl-dl-row"><dt>Job Class</dt><dd>{sheetData.job_class}</dd></div>
              <div className="dl-dl-row"><dt>Error Class</dt><dd className="err-text">{sheetData.error_class}</dd></div>
              <div className="dl-dl-row"><dt>Failed At</dt><dd>{formatTimeLong(sheetData.failed_at)}</dd></div>
            </dl>
            {sheetData.error_message && (
              <>
                <h4 className="sheet-sub">Error Message</h4>
                <pre className="sheet-pre">{sheetData.error_message}</pre>
              </>
            )}
          </div>
        )}
      </EwSheet>
    </DaylightLayout>
  );
}

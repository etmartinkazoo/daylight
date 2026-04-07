import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/formatters.js";

const severityVariant = { critical: "destructive", warning: "outline", info: "secondary" };

export default function IssueCard({ issue, expanded, onToggle, onDismiss, variant = "performance", typeLabel = "", typeClass = "" }) {
  return (
    <div className={`rounded-lg border bg-card text-card-foreground shadow-xs ${issue.severity === "critical" ? "border-destructive/50" : issue.severity === "warning" ? "border-amber-500/40" : "border-border"}`}>
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => onToggle(issue.id)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant={variant === "performance" ? "secondary" : "outline"} className={typeClass}>
            {typeLabel}
          </Badge>
          <span className={`size-1.5 rounded-full shrink-0 ${issue.severity === "critical" ? "bg-destructive" : issue.severity === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
          <span className="text-sm font-medium truncate">{issue.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {variant === "performance" ? (
            <>
              {issue.total_time_ms && (
                <span className="text-xs text-muted-foreground">
                  {issue.total_time_ms >= 1000 ? `${(issue.total_time_ms / 1000).toFixed(1)}s` : `${Math.round(issue.total_time_ms)}ms`} total
                </span>
              )}
              <Badge variant="secondary">{issue.occurrences}×</Badge>
            </>
          ) : (
            issue.confidence && (
              <Badge variant={issue.confidence === "high" ? "destructive" : issue.confidence === "medium" ? "outline" : "secondary"}>
                {issue.confidence}
              </Badge>
            )
          )}
          <svg
            className={`size-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 py-4 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{issue.description}</p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {variant === "performance" ? (
              <>
                {issue.source_location && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Source</span>
                    <code className="text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded">{issue.source_location}</code>
                  </div>
                )}
                {issue.controller_action && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Controller</span>
                    <code className="text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded">{issue.controller_action}</code>
                  </div>
                )}
                {issue.avg_duration_ms && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Avg Duration</span>
                    <span className="font-medium">{issue.avg_duration_ms.toFixed(1)}ms</span>
                  </div>
                )}
              </>
            ) : (
              <>
                {issue.file_path && (
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-xs text-muted-foreground font-medium">File</span>
                    <code className="text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded">{issue.file_path}{issue.line_number ? `:${issue.line_number}` : ""}</code>
                  </div>
                )}
                {issue.warning_type && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Warning Type</span>
                    <span className="text-sm">{issue.warning_type}</span>
                  </div>
                )}
                {issue.check_name && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Check</span>
                    <span className="text-sm">{issue.check_name}</span>
                  </div>
                )}
              </>
            )}
            {issue.detected_at && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground font-medium">Detected</span>
                <span className="text-sm">{timeAgo(issue.detected_at)}</span>
              </div>
            )}
          </div>

          {variant === "performance" && issue.sql_pattern && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">SQL Pattern</span>
              <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-x-auto">{issue.sql_pattern}</pre>
            </div>
          )}

          {variant === "security" && issue.code_snippet && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Vulnerable Code</span>
              <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-x-auto">{issue.code_snippet}</pre>
            </div>
          )}

          {issue.solution && (
            <div className="rounded-md border bg-muted/30 p-3 flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                {variant === "performance" ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    AI Suggestion
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    AI Fix Suggestion
                  </>
                )}
              </span>
              <div className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: issue.solution.replace(/\n/g, "<br>") }} />
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {variant === "security" && issue.link && (
              <Button variant="outline" size="sm" asChild>
                <a href={issue.link} target="_blank" rel="noopener">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Brakeman docs
                </a>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => onDismiss(issue.id, "fixed")}>Mark Fixed</Button>
            <Button size="sm" variant="ghost" onClick={() => onDismiss(issue.id, "ignored")}>Ignore</Button>
          </div>
        </div>
      )}
    </div>
  );
}

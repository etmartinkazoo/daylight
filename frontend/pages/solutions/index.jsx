import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import DaylightLayout from "../DaylightLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/formatters.js";

const severityVariant = { critical: "destructive", warning: "outline", info: "secondary" };
const statusVariant = { draft: "secondary", approved: "default", pushed: "secondary", rejected: "destructive" };
const sourceVariant = { performance: "outline", security: "destructive" };

const tabs = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "approved", label: "Approved" },
  { key: "pushed", label: "Pushed" },
  { key: "rejected", label: "Rejected" },
];

export default function SolutionsIndex({
  solutions = [], counts = {}, status = "all",
  last_scan_at, last_scan_count, last_scan_error, github_configured,
  base_path: base = "/daylight",
}) {
  const [generating, setGenerating] = useState(false);

  function generateSolutions() {
    setGenerating(true);
    router.post(`${base}/solutions/generate`, {}, {
      preserveState: true,
      onFinish: () => setGenerating(false),
    });
  }

  return (
    <DaylightLayout>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Solutions</h1>
            <p className="text-sm text-muted-foreground">AI-generated fixes for performance and security issues</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {last_scan_at && (
              <span className="text-xs text-muted-foreground">
                Last scan {timeAgo(last_scan_at)}{last_scan_count != null && <> &middot; {last_scan_count} found</>}
              </span>
            )}
            {last_scan_error && <span className="text-xs text-destructive">{last_scan_error}</span>}
            <Button onClick={generateSolutions} disabled={generating} size="sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
              {generating ? "Generating..." : "Generate Solutions"}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => router.get(`${base}/solutions`, { status: tab.key }, { preserveState: true })}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${status === tab.key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {tab.label}
              {tab.key !== "all" && counts[tab.key] > 0 && (
                <Badge variant="secondary" className="text-xs h-4 px-1">{counts[tab.key]}</Badge>
              )}
            </button>
          ))}
        </div>

        {solutions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            <p className="font-semibold text-sm">No solutions found</p>
            <p className="text-sm text-muted-foreground">No solutions to show for this filter. Try generating new solutions.</p>
          </div>
        ) : (
          <InfiniteScroll data="solutions" itemsElement="#solutions-list" startElement="#solutions-start">
            <div id="solutions-start" className="flex flex-col gap-3">
              <div id="solutions-list">
                {solutions.map((solution) => (
                  <Card
                    key={solution.id}
                    className="cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => router.get(`${base}/solutions/${solution.id}`)}
                  >
                    <CardContent className="flex gap-0 p-0">
                      <div className={`w-1 rounded-l-xl shrink-0 ${solution.severity === "critical" ? "bg-destructive" : solution.severity === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
                      <div className="flex flex-col gap-2 p-4 flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {solution.source_type && (
                              <Badge variant={sourceVariant[solution.source_type?.toLowerCase()] || "secondary"}>
                                {solution.source_type}
                              </Badge>
                            )}
                            {solution.severity && <Badge variant={severityVariant[solution.severity] || "secondary"}>{solution.severity}</Badge>}
                            <Badge variant={statusVariant[solution.status] || "secondary"}>{solution.status}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{timeAgo(solution.generated_at)}</span>
                        </div>
                        <h3 className="text-sm font-semibold">{solution.title}</h3>
                        {solution.problem_description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{solution.problem_description}</p>
                        )}
                        {solution.file_paths?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {solution.file_paths.slice(0, 3).map((fp, i) => (
                              <code key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{fp}</code>
                            ))}
                            {solution.file_paths.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{solution.file_paths.length - 3} more</span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {solution.status === "pushed" && solution.pr_url && (
                              <Button size="xs" variant="outline" asChild onClick={(e) => e.stopPropagation()}>
                                <a href={solution.pr_url} target="_blank" rel="noopener noreferrer">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 012 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
                                  PR
                                </a>
                              </Button>
                            )}
                            {solution.message_count > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                                {solution.message_count}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">View Details &rarr;</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </InfiniteScroll>
        )}
      </div>
    </DaylightLayout>
  );
}

import { Link } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/lib/formatters.js";

const severityVariant = { critical: "destructive", warning: "outline", info: "secondary" };
const statusVariant = { draft: "secondary", approved: "default", pushed: "secondary", rejected: "destructive" };
const sourceVariant = { performance: "outline", security: "destructive" };

function severityBorderClass(severity) {
  if (severity === "critical") return "border-l-4 border-l-destructive";
  if (severity === "warning") return "border-l-4 border-l-amber-500";
  return "border-l-4 border-l-blue-500";
}

export default function SolutionCard({ solution, base }) {
  return (
    <Link href={`${base}/solutions/${solution.id}`} className="block">
    <Card
      className={`cursor-pointer hover:shadow-sm transition-shadow ${severityBorderClass(solution.severity)}`}
    >
      <CardContent className="flex flex-col gap-2">
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
            <span className="text-sm text-muted-foreground shrink-0">{timeAgo(solution.generated_at)}</span>
          </div>
          <h3 className="text-sm font-semibold">{solution.title}</h3>
          {solution.problem_description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{solution.problem_description}</p>
          )}
          {solution.file_paths?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {solution.file_paths.slice(0, 3).map((fp, i) => (
                <code key={i} className="text-sm bg-muted px-1.5 py-0.5 rounded font-mono">{fp}</code>
              ))}
              {solution.file_paths.length > 3 && (
                <span className="text-sm text-muted-foreground">+{solution.file_paths.length - 3} more</span>
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
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  {solution.message_count}
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground">View Details &rarr;</span>
          </div>
      </CardContent>
    </Card>
    </Link>
  );
}

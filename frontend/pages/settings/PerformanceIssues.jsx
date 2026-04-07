import { useState } from "react";
import { router } from "@inertiajs/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import IssueCard from "./IssueCard.jsx";

const typeLabels = {
  n_plus_one: "N+1 Query",
  slow_query: "Slow Query",
  counter_cache: "Counter Cache",
};

export default function PerformanceIssues({ issues = [], base = "/daylight" }) {
  const [expandedIssue, setExpandedIssue] = useState(null);

  function toggleIssue(id) {
    setExpandedIssue(expandedIssue === id ? null : id);
  }

  function dismissIssue(id, status) {
    router.patch(`${base}/settings/performance_issues/${id}`, { new_status: status }, { preserveScroll: true });
  }

  if (issues.length === 0) return null;

  return (
    <Card>
      <CardHeader className="border-b py-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">Performance Issues</CardTitle>
          <Badge variant="outline">{issues.length} open</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex flex-col gap-2">
        {issues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            expanded={expandedIssue === issue.id}
            onToggle={toggleIssue}
            onDismiss={dismissIssue}
            variant="performance"
            typeLabel={typeLabels[issue.issue_type] || issue.issue_type}
            typeClass={issue.issue_type}
          />
        ))}
      </CardContent>
    </Card>
  );
}

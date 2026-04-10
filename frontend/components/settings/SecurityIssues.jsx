import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import IssueCard from "@/components/settings/IssueCard.jsx";

const secTypeLabels = {
  injection: "Injection",
  xss: "XSS",
  csrf: "CSRF",
  mass_assignment: "Mass Assignment",
  rce: "Remote Code Exec",
  redirect: "Unsafe Redirect",
  file_access: "File Access",
  config: "Configuration",
  auth: "Authentication",
  render: "Dynamic Render",
  other: "Other",
};

export default function SecurityIssues({ issues = [], base = "/daylight" }) {
  const [expandedSecIssue, setExpandedSecIssue] = useState(null);

  const secCriticalCount = issues.filter((i) => i.severity === "critical").length;
  const secWarningCount = issues.filter((i) => i.severity === "warning").length;

  function toggleSecIssue(id) {
    setExpandedSecIssue(expandedSecIssue === id ? null : id);
  }

  if (issues.length === 0) return null;

  return (
    <Card>
      <CardHeader className="border-b py-4">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Security Issues
          </CardTitle>
          {secCriticalCount > 0 && <Badge variant="destructive">{secCriticalCount} critical</Badge>}
          {secWarningCount > 0 && <Badge variant="outline" className="border-amber-500/60 text-amber-600">{secWarningCount} warning</Badge>}
          <Badge variant="secondary">{issues.length} total</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex flex-col gap-2">
        {issues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            expanded={expandedSecIssue === issue.id}
            onToggle={toggleSecIssue}
            dismissAction={`${base}/settings/security_issues`}
            variant="security"
            typeLabel={secTypeLabels[issue.issue_type] || issue.warning_type}
            typeClass=""
          />
        ))}
      </CardContent>
    </Card>
  );
}

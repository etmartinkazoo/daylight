import { useState } from "react";
import { Form, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import EwSheet from "@/components/errors/EwSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { markdownToHtml } from "@/lib/markdown.js";
import { timeAgo, formatTimeLong } from "@/lib/formatters.js";

const severityVariant = { critical: "destructive", warning: "outline", info: "secondary" };
const statusVariant = { open: "destructive", investigating: "outline", resolved: "secondary", false_alarm: "ghost" };

export default function IncidentShow({ incident = {}, related_error = null, related_deploy = null, base_path: base = "/daylight" }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const investigationHtml = markdownToHtml(incident.investigation);
  const triggerEntries = incident.trigger_data && typeof incident.trigger_data === "object" ? Object.entries(incident.trigger_data) : [];

  const actionUrl = `${base}/incidents/${incident.id}`;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">
        <Button variant="ghost" size="sm" className="w-fit -ml-1" asChild>
          <Link href={`${base}/incidents`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            All Incidents
          </Link>
        </Button>

        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-semibold">{incident.title}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={severityVariant[incident.severity] || "secondary"}>{incident.severity}</Badge>
            {incident.incident_type && <Badge variant="outline">{incident.incident_type}</Badge>}
            <Badge variant={statusVariant[incident.status] || "secondary"}>
              {incident.status === "investigating" && <span className="mr-1 size-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />}
              {incident.status === "false_alarm" ? "False Alarm" : incident.status}
            </Badge>
            <span className="text-sm text-muted-foreground">Started {timeAgo(incident.started_at)} &middot; {formatTimeLong(incident.started_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(incident.status === "open" || incident.status === "investigating") ? (
            <>
              <Form method="patch" action={actionUrl} data={{ status: "resolved" }} className="inline">
                {() => (
                  <Button type="submit" size="sm">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Resolve
                  </Button>
                )}
              </Form>
              <Form method="patch" action={actionUrl} data={{ status: "false_alarm" }} className="inline">
                {() => <Button type="submit" size="sm" variant="outline">Mark False Alarm</Button>}
              </Form>
            </>
          ) : (
            <Form method="patch" action={actionUrl} data={{ status: "open" }} className="inline">
              {() => <Button type="submit" size="sm" variant="outline">Reopen</Button>}
            </Form>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSheetOpen(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Ask AI
          </Button>
        </div>

        {triggerEntries.length > 0 && (
          <Card>
            <CardHeader className="border-b py-3"><CardTitle className="text-sm">Trigger Data</CardTitle></CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {triggerEntries.map(([key, value]) => (
                <div key={key} className="flex px-4 py-2 gap-4 text-sm">
                  <dt className="text-muted-foreground w-32 shrink-0 capitalize">{key.replace(/_/g, " ")}</dt>
                  <dd className="font-mono text-sm">{typeof value === "object" ? JSON.stringify(value) : value}</dd>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {related_deploy && (
          <Card>
            <CardHeader className="border-b py-3"><CardTitle className="text-sm">Related Deploy</CardTitle></CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {related_deploy.version && <div className="flex px-4 py-2 gap-4 text-sm"><dt className="text-muted-foreground w-32 shrink-0">Version</dt><dd>{related_deploy.version}</dd></div>}
              {related_deploy.git_sha && <div className="flex px-4 py-2 gap-4 text-sm"><dt className="text-muted-foreground w-32 shrink-0">Git SHA</dt><dd className="font-mono text-sm">{related_deploy.git_sha}</dd></div>}
              {related_deploy.deployed_by && <div className="flex px-4 py-2 gap-4 text-sm"><dt className="text-muted-foreground w-32 shrink-0">Deployed by</dt><dd>{related_deploy.deployed_by}</dd></div>}
              {related_deploy.deployed_at && <div className="flex px-4 py-2 gap-4 text-sm"><dt className="text-muted-foreground w-32 shrink-0">Deployed at</dt><dd>{formatTimeLong(related_deploy.deployed_at)}</dd></div>}
            </CardContent>
          </Card>
        )}

        {related_error && (
          <Card>
            <CardHeader className="border-b py-3"><CardTitle className="text-sm">Related Error</CardTitle></CardHeader>
            <CardContent className="p-0 divide-y divide-border">
              {related_error.error_class && <div className="flex px-4 py-2 gap-4 text-sm"><dt className="text-muted-foreground w-32 shrink-0">Error Class</dt><dd className="font-mono text-destructive text-sm">{related_error.error_class}</dd></div>}
              {related_error.message && <div className="flex px-4 py-2 gap-4 text-sm"><dt className="text-muted-foreground w-32 shrink-0">Message</dt><dd className="text-sm">{related_error.message}</dd></div>}
              {related_error.occurrences_count != null && <div className="flex px-4 py-2 gap-4 text-sm"><dt className="text-muted-foreground w-32 shrink-0">Occurrences</dt><dd>{related_error.occurrences_count}</dd></div>}
              {related_error.id && (
                <div className="px-4 py-3">
                  <Button size="sm" variant="outline" asChild>
                    <a href={`${base}/errors/${related_error.id}`}>View Error &rarr;</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="border-b py-3"><CardTitle className="text-sm">Investigation Report</CardTitle></CardHeader>
          <CardContent className="pt-4">
            {incident.investigation ? (
              incident.investigation.includes("unavailable") ? (
                <p className="text-sm text-muted-foreground">{incident.investigation}</p>
              ) : (
                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: investigationHtml }} />
              )
            ) : incident.status === "investigating" ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="size-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">AI is investigating this incident...</span>
                  <span className="text-sm">Analysis in progress. This page will update when complete.</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No investigation report available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <EwSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={incident.title || "Incident"}
        aiContext={incident.ai_context || ""}
      >
        <div className="text-sm text-muted-foreground">Use the AI tab to ask questions about this incident.</div>
      </EwSheet>
    </AppLayout>
  );
}

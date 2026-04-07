import { router } from "@inertiajs/react";
import DaylightLayout from "../DaylightLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/formatters.js";

const statusVariant = { open: "destructive", resolved: "secondary", ignored: "outline" };

export default function ErrorShow({ error = {}, occurrences = [], base_path: base = "/daylight" }) {
  function updateStatus(status) {
    router.patch(`${base}/errors/${error.id}`, { status, filter_status: "open" });
  }

  function deleteError() {
    if (confirm("Delete this error and all occurrences?")) {
      router.delete(`${base}/errors/${error.id}`);
    }
  }

  return (
    <DaylightLayout>
      <div className="flex flex-col gap-6 p-6">
        <Button variant="ghost" size="sm" className="w-fit -ml-1" asChild>
          <a href={`${base}/errors`}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 12L6 8l4-4"/></svg>
            Back to errors
          </a>
        </Button>

        <Card>
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="font-mono text-base">{error.error_class}</CardTitle>
                <Badge variant={statusVariant[error.status] || "outline"}>{error.status}</Badge>
              </div>
              <div className="flex gap-2 shrink-0">
                {error.status === "open" ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => updateStatus("resolved")}>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13.25 4.75L6 12 2.75 8.75"/></svg>
                      Resolve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus("ignored")}>Ignore</Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => updateStatus("open")}>Reopen</Button>
                )}
                <Button size="sm" variant="destructive" onClick={deleteError}>Delete</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Occurrences</span>
                <span className="font-semibold">{error.occurrences_count}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">First seen</span>
                <span className="font-semibold">{formatTime(error.first_seen_at)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Last seen</span>
                <span className="font-semibold">{formatTime(error.last_seen_at)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {error.backtrace_summary && (
          <Card>
            <CardHeader className="border-b py-3">
              <CardTitle className="text-sm">Backtrace</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="overflow-x-auto p-4 text-xs font-mono leading-relaxed text-muted-foreground">{error.backtrace_summary}</pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="border-b py-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Recent Occurrences</CardTitle>
              <Badge variant="secondary">{occurrences.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            {occurrences.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No occurrences recorded yet.</p>
            ) : occurrences.map((occ) => (
              <div key={occ.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-muted-foreground">{formatTime(occ.occurred_at)}</span>
                  {occ.request_url && (
                    <span className="text-xs flex items-center gap-1.5">
                      <Badge variant="outline" className="font-mono">{occ.request_method}</Badge>
                      <span className="font-mono text-muted-foreground truncate max-w-xs">{occ.request_url}</span>
                    </span>
                  )}
                </div>
                {occ.context && Object.keys(occ.context).length > 0 && (
                  <pre className="text-xs font-mono bg-muted/50 rounded-md p-3 overflow-x-auto">{JSON.stringify(occ.context, null, 2)}</pre>
                )}
                {occ.backtrace && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4l4 4-4 4"/></svg>
                      Backtrace
                    </summary>
                    <pre className="mt-2 font-mono bg-muted/50 rounded-md p-3 overflow-x-auto text-muted-foreground">{occ.backtrace}</pre>
                  </details>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DaylightLayout>
  );
}

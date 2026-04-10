import { useState, useEffect, useRef } from "react";
import { usePage, Form } from "@inertiajs/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EwAiChat from "@/components/errors/EwAiChat";

const statusVariant = { open: "destructive", resolved: "secondary", ignored: "outline" };

export default function ErrorSheet({ open, onClose, error, returnStatus = "open" }) {
  const { props } = usePage();
  const base = props?.base_path || "/daylight";
  const ewSettings = props.ew_settings || {};
  const [tab, setTab] = useState("info");
  const aiChatRef = useRef(null);

  const appContextStr = [
    ewSettings.ai_context_notes,
    ewSettings.github_repo_url && `GitHub repo: ${ewSettings.github_repo_url} (branch: ${ewSettings.github_default_branch || "main"})`,
  ].filter(Boolean).join("\n");

  useEffect(() => {
    if (open) setTab("info");
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (open) {
          if (tab === "ai") onClose();
          else { setTab("ai"); setTimeout(() => aiChatRef.current?.focus?.(), 50); }
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, tab, onClose]);

  function statusFormAction(newStatus) {
    return `${base}/errors/${error?.id}`;
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="truncate text-sm font-mono">{error?.error_class || "Error"}</SheetTitle>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </Button>
          </div>
          <Tabs value={tab} onValueChange={(v) => {
            if (!v) return;
            setTab(v);
            if (v === "ai") setTimeout(() => aiChatRef.current?.focus?.(), 50);
          }}>
            <TabsList className="h-8">
              <TabsTrigger value="info" className="text-sm px-3">Info</TabsTrigger>
              <TabsTrigger value="ai" className="text-sm px-3">AI</TabsTrigger>
            </TabsList>
          </Tabs>
        </SheetHeader>

        {tab === "ai" ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <EwAiChat ref={aiChatRef} context={error?.ai_context || ""} appContext={appContextStr} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant[error.status] || "outline"}>{error.status}</Badge>
                <span className="text-sm text-muted-foreground">{error.occurrences_count} occurrence{error.occurrences_count === 1 ? "" : "s"}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Message</span>
                <p className="text-sm">{error.message}</p>
              </div>

              {error.recent_occurrences?.length > 0 && (() => {
                const lastOcc = error.recent_occurrences[0];
                return (lastOcc.request_url || lastOcc.context?.route || lastOcc.context?.controller_action) ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Where</span>
                    <dl className="text-sm divide-y divide-border rounded-md border">
                      {lastOcc.request_method && lastOcc.request_url && (
                        <div className="flex gap-3 px-3 py-2"><dt className="text-muted-foreground w-20 shrink-0">URL</dt><dd className="font-mono text-sm break-all">{lastOcc.request_method} {lastOcc.request_url}</dd></div>
                      )}
                      {lastOcc.context?.route && <div className="flex gap-3 px-3 py-2"><dt className="text-muted-foreground w-20 shrink-0">Route</dt><dd>{lastOcc.context.route}</dd></div>}
                      {lastOcc.context?.controller_action && <div className="flex gap-3 px-3 py-2"><dt className="text-muted-foreground w-20 shrink-0">Controller</dt><dd>{lastOcc.context.controller_action}</dd></div>}
                      {lastOcc.context?.tenant && <div className="flex gap-3 px-3 py-2"><dt className="text-muted-foreground w-20 shrink-0">Tenant</dt><dd>{lastOcc.context.tenant}</dd></div>}
                      {lastOcc.context?.user_name && <div className="flex gap-3 px-3 py-2"><dt className="text-muted-foreground w-20 shrink-0">User</dt><dd>{lastOcc.context.user_name} (#{lastOcc.context.user_id})</dd></div>}
                    </dl>
                  </div>
                ) : null;
              })()}

              <dl className="text-sm divide-y divide-border rounded-md border">
                <div className="flex gap-3 px-3 py-2"><dt className="text-muted-foreground w-20 shrink-0">First seen</dt><dd>{error.first_seen_at}</dd></div>
                <div className="flex gap-3 px-3 py-2"><dt className="text-muted-foreground w-20 shrink-0">Last seen</dt><dd>{error.last_seen_at}</dd></div>
                <div className="flex gap-3 px-3 py-2"><dt className="text-muted-foreground w-20 shrink-0">Severity</dt><dd>{error.severity}</dd></div>
              </dl>

              {error.backtrace_summary && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Backtrace</span>
                  <pre className="text-sm font-mono bg-muted/50 rounded-md p-3 overflow-x-auto">{error.backtrace_summary}</pre>
                </div>
              )}

              {error.recent_occurrences?.length > 1 && (
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Occurrences</span>
                  <ul className="text-sm divide-y divide-border rounded-md border">
                    {error.recent_occurrences.map((occ) => (
                      <li key={occ.id} className="flex flex-wrap gap-x-3 gap-y-0.5 px-3 py-2">
                        <span className="text-muted-foreground">{occ.occurred_at}</span>
                        {occ.request_url && <span className="font-mono">{occ.request_method} {occ.request_url}</span>}
                        {occ.context?.route && <span className="text-muted-foreground">{occ.context.route}</span>}
                        {occ.context?.user_name && <span className="text-muted-foreground">{occ.context.user_name}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap border-t pt-4">
                {error.status === "open" ? (
                  <>
                    <Form method="patch" action={statusFormAction()} data={{ status: "resolved", return_status: returnStatus }} options={{ onSuccess: onClose }} className="inline">
                      {() => <Button type="submit" size="sm">Resolve</Button>}
                    </Form>
                    <Form method="patch" action={statusFormAction()} data={{ status: "ignored", return_status: returnStatus }} options={{ onSuccess: onClose }} className="inline">
                      {() => <Button type="submit" size="sm" variant="outline">Ignore</Button>}
                    </Form>
                  </>
                ) : (
                  <Form method="patch" action={statusFormAction()} data={{ status: "open", return_status: returnStatus }} options={{ onSuccess: onClose }} className="inline">
                    {() => <Button type="submit" size="sm" variant="outline">Reopen</Button>}
                  </Form>
                )}
                <Button size="sm" variant="ghost" asChild>
                  <a href={`${base}/errors/${error.id}`}>View full detail &rarr;</a>
                </Button>
              </div>
            </div>
          ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

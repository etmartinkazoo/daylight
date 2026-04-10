import { Form, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DetailRow } from "@/components/ui/detail-row";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { formatTime } from "@/lib/formatters.js";

const statusVariant = { open: "destructive", resolved: "secondary", ignored: "outline" };

function OccurrenceRow({ occ }) {
  const contextKeys = occ.context ? Object.keys(occ.context) : [];

  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground tabular-nums">{formatTime(occ.occurred_at)}</span>
        {occ.request_url && (
          <>
            <Badge variant="outline" className="font-mono text-sm">{occ.request_method}</Badge>
            <span className="font-mono text-sm text-muted-foreground truncate max-w-sm">{occ.request_url}</span>
          </>
        )}
      </div>

      {contextKeys.length > 0 && (
        <dl className="text-sm divide-y divide-border rounded-md border">
          {contextKeys.map((k) => (
            <div key={k} className="flex gap-3 px-3 py-1.5">
              <dt className="text-muted-foreground w-28 shrink-0">{k}</dt>
              <dd className="font-mono truncate">{String(occ.context[k])}</dd>
            </div>
          ))}
        </dl>
      )}

      {occ.backtrace && (
        <Accordion type="single" collapsible>
          <AccordionItem value="backtrace" className="border rounded-md">
            <AccordionTrigger className="px-3 py-2 text-sm text-muted-foreground hover:no-underline hover:text-foreground">
              Backtrace
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-0">
              <pre className="text-sm font-mono bg-muted/50 rounded-md p-3 overflow-x-auto text-muted-foreground mb-3">{occ.backtrace}</pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}

export default function ErrorShow({ error = {}, occurrences = [], base_path: base = "/daylight" }) {
  const actionUrl = `${base}/errors/${error.id}`;

  return (
    <AppLayout>
      <div className="flex items-center justify-between border-b px-6 py-3 shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" className="-ml-1 shrink-0" asChild>
            <Link href={`${base}/errors`}>
              <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
              Back
            </Link>
          </Button>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-sm font-medium truncate">{error.error_class}</span>
          <Badge variant={statusVariant[error.status] || "outline"}>{error.status}</Badge>
        </div>
        <div className="flex gap-2 shrink-0">
          {error.status === "open" ? (
            <>
              <Form method="patch" action={actionUrl} data={{ status: "resolved", filter_status: "open" }} className="inline">
                {() => <Button type="submit" size="sm" variant="outline">Resolve</Button>}
              </Form>
              <Form method="patch" action={actionUrl} data={{ status: "ignored", filter_status: "open" }} className="inline">
                {() => <Button type="submit" size="sm" variant="outline">Ignore</Button>}
              </Form>
            </>
          ) : (
            <Form method="patch" action={actionUrl} data={{ status: "open", filter_status: "open" }} className="inline">
              {() => <Button type="submit" size="sm" variant="outline">Reopen</Button>}
            </Form>
          )}
          <Form method="delete" action={actionUrl} options={{ onBefore: () => confirm("Delete this error and all occurrences?") }} className="inline">
            {() => <Button type="submit" size="sm" variant="destructive">Delete</Button>}
          </Form>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6">

        <Card>
          <CardContent className="pt-4 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <div className="divide-y divide-border">
              <DetailRow label="Occurrences"><span className="font-semibold">{error.occurrences_count}</span></DetailRow>
              <DetailRow label="First seen">{formatTime(error.first_seen_at)}</DetailRow>
              <DetailRow label="Last seen">{formatTime(error.last_seen_at)}</DetailRow>
              <DetailRow label="Severity">{error.severity}</DetailRow>
            </div>
          </CardContent>
        </Card>

        {error.backtrace_summary && (
          <Card>
            <CardHeader className="border-b py-3">
              <CardTitle className="text-sm">Backtrace</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <pre className="overflow-x-auto p-4 text-sm font-mono leading-relaxed text-muted-foreground">{error.backtrace_summary}</pre>
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
              <OccurrenceRow key={occ.id} occ={occ} />
            ))}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}

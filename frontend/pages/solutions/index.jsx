import { useState } from "react";
import { Link, InfiniteScroll, Form } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/formatters.js";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import SolutionCard from "@/components/solutions/SolutionCard";

const tabs = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "approved", label: "Approved" },
  { key: "pushed", label: "Pushed" },
  { key: "rejected", label: "Rejected" },
];

export default function SolutionsIndex({
  solutions = [],
  counts = {},
  status = "all",
  last_scan_at,
  last_scan_count,
  last_scan_error,
  github_configured,
  base_path: base = "/daylight",
}) {
  const [generating, setGenerating] = useState(false);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader
          title="Solutions"
          description="AI-generated fixes for performance and security issues"
          actions={
            <>
              {last_scan_at && (
                <span className="text-sm text-muted-foreground">
                  Last scan {timeAgo(last_scan_at)}
                  {last_scan_count != null && (
                    <> &middot; {last_scan_count} found</>
                  )}
                </span>
              )}
              {last_scan_error && (
                <span className="text-sm text-destructive">
                  {last_scan_error}
                </span>
              )}
              <Form method="post" action={`${base}/solutions/generation`} options={{ preserveState: true, onBefore: () => setGenerating(true), onFinish: () => setGenerating(false) }} className="inline">
                {() => (
                  <Button
                    type="submit"
                    disabled={generating}
                    size="sm"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                    {generating ? "Generating..." : "Generate Solutions"}
                  </Button>
                )}
              </Form>
            </>
          }
        />

        <Tabs value={status}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} asChild>
                <Link href={`${base}/solutions`} data={{ status: tab.key }} preserveState>
                  {tab.label}
                  {tab.key !== "all" && counts[tab.key] > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1.5 text-sm h-4 px-1"
                    >
                      {counts[tab.key]}
                    </Badge>
                  )}
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {solutions.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No solutions found</EmptyTitle>
              <EmptyDescription>
                No solutions to show for this filter. Try generating new
                solutions.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <InfiniteScroll
            data="solutions"
            itemsElement="#solutions-list"
            startElement="#solutions-start"
          >
            <div id="solutions-start" className="flex flex-col gap-3">
              <div id="solutions-list">
                {solutions.map((solution) => (
                  <SolutionCard
                    key={solution.id}
                    solution={solution}
                    base={base}
                  />
                ))}
              </div>
            </div>
          </InfiniteScroll>
        )}
      </div>
    </AppLayout>
  );
}

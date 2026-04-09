import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const TOOL_LABELS = {
  query: "Search",
  details: "Lookup",
  project_summary: "Project Summary",
  milestone_todos: "Milestone Todos",
  find_similar_todos: "Find Similar",
  project_reorg: "Reorganize",
  github_search: "Code Search",
  github_read_file: "Read File",
  browse_url: "Browse URL",
};

export default function ToolCard({ tool = "", message = "", arguments: args, status = "running", result = "" }) {
  const toolLabel = TOOL_LABELS[tool] || tool;
  const toolIcon = status === "running" ? "running" : status === "error" ? "error" : "done";

  return (
    <div className={`rounded-md border bg-muted/10 overflow-hidden text-sm ${status === "error" ? "border-destructive/50" : ""}`}>
      <Accordion type="single" collapsible>
        <AccordionItem value="tool" className="border-0">
          <AccordionTrigger
            className="px-3 py-2 hover:no-underline hover:bg-muted/50 rounded-none text-sm"
            {...(!args ? { onClick: (e) => e.preventDefault(), className: "px-3 py-2 hover:no-underline rounded-none text-sm cursor-default [&>svg]:hidden" } : {})}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground">
                {toolIcon === "running" && (
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="8" cy="8" r="6" strokeDasharray="28 10" />
                  </svg>
                )}
                {toolIcon === "error" && (
                  <svg className="w-4 h-4 text-destructive" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M6 6l4 4M10 6l-4 4"/></svg>
                )}
                {toolIcon === "done" && (
                  <svg className="w-4 h-4 text-green-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M5.5 8.5l2 2 3.5-4"/></svg>
                )}
              </span>
              <span className="font-medium text-foreground shrink-0">{toolLabel}</span>
              <span className="text-muted-foreground truncate">{message}</span>
              {result && status !== "running" && <span className="text-muted-foreground shrink-0 ml-auto mr-2">{result}</span>}
            </div>
          </AccordionTrigger>
          {args && (
            <AccordionContent className="px-3 pb-0">
              <div className="flex flex-col gap-1 border-t pt-2 pb-3">
                {Object.entries(args).map(([key, val]) => (
                  <div key={key} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground font-mono shrink-0">{key}</span>
                    <span className="text-foreground font-mono truncate">{typeof val === "object" ? JSON.stringify(val) : val}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          )}
        </AccordionItem>
      </Accordion>
    </div>
  );
}

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export default function SourcesBlock({ sources = [] }) {
  if (sources.length === 0) return null;

  return (
    <div className="rounded-md border bg-muted/20 overflow-hidden mt-2">
      <Accordion type="single" collapsible>
        <AccordionItem value="sources" className="border-0">
          <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-muted/50 rounded-none text-sm">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-muted-foreground shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4h12M2 8h8M2 12h10"/>
              </svg>
              <span className="text-muted-foreground text-sm">Used {sources.length} source{sources.length !== 1 ? "s" : ""}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-0">
            <div className="flex flex-col gap-1 pb-3">
              {sources.map((source, i) => {
                const inner = (
                  <>
                    <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 bg-muted text-muted-foreground">
                      {source.icon || source.type?.charAt(0) || "?"}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-foreground truncate text-sm">{source.title}</span>
                      {source.detail && <span className="text-muted-foreground truncate text-sm">{source.detail}</span>}
                    </div>
                  </>
                );
                return source.url ? (
                  <a key={i} href={source.url} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-muted no-underline text-foreground" target="_blank" rel="noopener noreferrer">{inner}</a>
                ) : (
                  <div key={i} className="flex items-center gap-2 rounded px-1 py-1">{inner}</div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

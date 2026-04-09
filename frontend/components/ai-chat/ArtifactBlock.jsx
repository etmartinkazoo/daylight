import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const TYPE_MAP = {
  document: { icon: "D", label: "Document" },
  code: { icon: "<>", label: "Code" },
  plan: { icon: "P", label: "Plan" },
  note: { icon: "N", label: "Note" },
  table: { icon: "T", label: "Table" },
};

export default function ArtifactBlock({ title = "", description = "", type = "document", actions, children }) {
  const { icon: typeIcon, label: typeLabel } = TYPE_MAP[type] || { icon: "A", label: "Artifact" };

  return (
    <div className="rounded-md border bg-muted/20 overflow-hidden mt-2">
      <Accordion type="single" collapsible defaultValue="artifact">
        <AccordionItem value="artifact" className="border-0">
          <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-muted/30 rounded-none bg-muted/30 text-sm">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                {typeIcon}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-foreground text-sm">{title || typeLabel}</span>
                {description && <span className="text-muted-foreground text-sm">{description}</span>}
              </div>
            </div>
            {actions && <div className="flex items-center gap-1 mr-2" onClick={(e) => e.stopPropagation()}>{actions}</div>}
          </AccordionTrigger>
          <AccordionContent className="p-3 pb-0">
            <div className="pb-3">{children}</div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

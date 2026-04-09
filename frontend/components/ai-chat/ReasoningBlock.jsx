import { useEffect, useState } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export default function ReasoningBlock({ content = "", isStreaming = false, isDone = false, duration = 0 }) {
  const [value, setValue] = useState("reasoning");

  useEffect(() => {
    if (isDone && content) {
      const t = setTimeout(() => setValue(""), 500);
      return () => clearTimeout(t);
    }
  }, [isDone, content]);

  useEffect(() => {
    if (isStreaming && content) setValue("reasoning");
  }, [isStreaming, content]);

  return (
    <div className={`rounded-md border bg-muted/20 overflow-hidden ${isStreaming && !isDone ? "border-amber-300/50" : ""}`}>
      <Accordion type="single" collapsible value={value} onValueChange={setValue}>
        <AccordionItem value="reasoning" className="border-0">
          <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-muted/50 rounded-none text-sm">
            <div className="flex items-center gap-2">
              {isStreaming && !isDone ? (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              ) : (
                <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1"/>
                </svg>
              )}
              <span className="text-muted-foreground text-sm">
                {isStreaming && !isDone ? "Thinking..." : duration ? `Thought for ${duration}s` : "Reasoning"}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-0">
            <div className="text-sm text-muted-foreground whitespace-pre-wrap font-mono pb-3">
              {content}
              {isStreaming && !isDone && <span className="inline-block w-0.5 h-3 bg-muted-foreground ml-0.5 animate-pulse align-text-bottom" />}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

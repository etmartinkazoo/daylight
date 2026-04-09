import { useState, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EwAiChat from "@/components/errors/EwAiChat";

export default function EwSheet({ open, onClose, title = "", aiContext = "", children }) {
  const { props } = usePage();
  const ewSettings = props.ew_settings || {};
  const [tab, setTab] = useState("info");

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
          else setTab("ai");
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, tab, onClose]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="truncate text-sm">{title}</SheetTitle>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </Button>
          </div>
          <Tabs value={tab} onValueChange={(v) => v && setTab(v)}>
            <TabsList className="h-8">
              <TabsTrigger value="info" className="text-sm px-3">Info</TabsTrigger>
              <TabsTrigger value="ai" className="text-sm px-3">AI</TabsTrigger>
            </TabsList>
          </Tabs>
        </SheetHeader>

        {tab === "ai" ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <EwAiChat context={aiContext} appContext={appContextStr} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">{children}</div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

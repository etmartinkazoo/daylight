import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export default function PersistentLayout({ children }) {
  return (
    <ThemeProvider attribute="data-theme" storageKey="daylight-theme" defaultTheme="system" disableTransitionOnChange>
      <TooltipProvider delayDuration={0}>
        {children}
        <Toaster richColors />
      </TooltipProvider>
    </ThemeProvider>
  );
}

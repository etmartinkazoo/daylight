import { AppShell } from "@/components/app-shell";
import { AppSidebar } from "@/components/app-sidebar";
import { AppContent } from "@/components/app-content";
import { AppSidebarHeader } from "@/components/app-sidebar-header";

export default function AppLayout({ children }) {
  return (
    <AppShell variant="sidebar">
      <AppSidebar />
      <AppContent variant="sidebar" className="overflow-x-hidden">
        <AppSidebarHeader />
        <div className="flex flex-1 flex-col overflow-auto">
          {children}
        </div>
      </AppContent>
    </AppShell>
  );
}

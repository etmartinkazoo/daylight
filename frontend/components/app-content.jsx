import { SidebarInset } from "@/components/ui/sidebar";

export function AppContent({ children, variant = "header", ...props }) {
  if (variant === "sidebar") {
    return <SidebarInset {...props}>{children}</SidebarInset>;
  }

  return (
    <main className="mx-auto flex h-full w-full flex-1 flex-col gap-4" {...props}>
      {children}
    </main>
  );
}

import { Link, usePage } from "@inertiajs/react";
import { useTheme } from "next-themes";
import NavIcon from "@/components/ui/nav-icon";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const navGroups = [
  {
    label: "Observability",
    items: [
      { label: "Errors",    href: "/errors",    icon: "errors" },
      { label: "Incidents", href: "/incidents", icon: "incidents" },
      { label: "Solutions", href: "/solutions", icon: "solutions" },
    ],
  },
  {
    label: "Performance",
    items: [
      { label: "Requests", href: "/requests", icon: "requests" },
      { label: "Queries",  href: "/queries",  icon: "queries" },
      { label: "Jobs",     href: "/jobs",     icon: "jobs" },
      { label: "Logs",     href: "/logs",     icon: "logs" },
    ],
  },
  {
    label: "Infrastructure",
    items: [
      { label: "HTTP",      href: "/http_requests",   icon: "http" },
      { label: "Cache",     href: "/cache",           icon: "cache" },
      { label: "Scheduled", href: "/scheduled_tasks", icon: "scheduled" },
      { label: "Mail",      href: "/mail_events",     icon: "mail" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Health",   href: "/health",   icon: "health" },
      { label: "Settings", href: "/settings", icon: "settings" },
    ],
  },
];

export function AppSidebar(props) {
  const { url, props: pageProps } = usePage();
  const base = pageProps?.base_path || "/daylight";
  const currentUrl = url?.split("?")[0] || "";
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  function isActive(href) {
    const full = `${base}${href}`;
    return currentUrl.startsWith(full) || (currentUrl === base && href === "/errors");
  }

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={base} prefetch>
                <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                </span>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Daylight</span>
                  <span className="text-sm text-muted-foreground">Monitoring</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group, i) => (
          <div key={group.label}>
            <SidebarGroup className="px-2 py-0">
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={{ children: item.label }}
                    >
                      <Link href={`${base}${item.href}`} prefetch>
                        <NavIcon icon={item.icon} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
            {i < navGroups.length - 1 && <SidebarSeparator />}
          </div>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setTheme(isDark ? "light" : "dark")}
              tooltip={{ children: isDark ? "Light mode" : "Dark mode" }}
            >
              {isDark ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
              <span>{isDark ? "Light mode" : "Dark mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={{ children: "Back to app" }}>
              <a href="/" data-turbo="false">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
                <span>Back to app</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

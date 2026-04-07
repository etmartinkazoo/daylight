import { usePage } from "@inertiajs/react";
import { useState, useEffect } from "react";
import NavIcon from "@/components/ui/nav-icon";
import { Button } from "@/components/ui/button";

export default function DaylightLayout({ children }) {
  const { url, props } = usePage();
  const base = props?.base_path || "/daylight";
  const currentUrl = url?.split("?")[0] || "";

  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("daylight-theme");
    if (saved) {
      setDark(saved === "dark");
    } else {
      setDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("daylight-theme", dark ? "dark" : "light");
  }, [dark]);

  const nav = [
    { label: "Errors", href: `${base}/errors`, match: `${base}/errors`, icon: "errors" },
    { label: "Incidents", href: `${base}/incidents`, match: `${base}/incidents`, icon: "incidents" },
    { label: "Solutions", href: `${base}/solutions`, match: `${base}/solutions`, icon: "solutions" },
    { label: "Requests", href: `${base}/requests`, match: `${base}/requests`, icon: "requests" },
    { label: "Queries", href: `${base}/queries`, match: `${base}/queries`, icon: "queries" },
    { label: "Jobs", href: `${base}/jobs`, match: `${base}/jobs`, icon: "jobs" },
    { label: "Logs", href: `${base}/logs`, match: `${base}/logs`, icon: "logs" },
    { label: "HTTP", href: `${base}/http_requests`, match: `${base}/http_requests`, icon: "http" },
    { label: "Cache", href: `${base}/cache`, match: `${base}/cache`, icon: "cache" },
    { label: "Scheduled", href: `${base}/scheduled_tasks`, match: `${base}/scheduled_tasks`, icon: "scheduled" },
    { label: "Mail", href: `${base}/mail_events`, match: `${base}/mail_events`, icon: "mail" },
    { label: "Health", href: `${base}/health`, match: `${base}/health`, icon: "health" },
    { label: "Settings", href: `${base}/settings`, match: `${base}/settings`, icon: "settings" },
  ];

  const primaryNav = nav.slice(0, 7);
  const secondaryNav = nav.slice(7, 11);
  const utilNav = nav.slice(11);

  function isActive(item) {
    if (!item.match) return false;
    return currentUrl.startsWith(item.match) || (currentUrl === base && item.match === `${base}/errors`);
  }

  function NavGroup({ items }) {
    return (
      <div className="nav-group">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={`nav-item${isActive(item) ? " active" : ""}`}
          >
            <NavIcon icon={item.icon} />
            <span className="nav-label">{item.label}</span>
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <a href={base} className="brand-link">
            <span className="brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
            <span className="brand-name">Daylight</span>
          </a>
        </div>

        <nav className="nav">
          <NavGroup items={primaryNav} />
          <div className="nav-divider" />
          <div className="nav-group">
            <span className="nav-section-label">Infrastructure</span>
            {secondaryNav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`nav-item${isActive(item) ? " active" : ""}`}
              >
                <NavIcon icon={item.icon} />
                <span className="nav-label">{item.label}</span>
              </a>
            ))}
          </div>
          <div className="nav-divider" />
          <NavGroup items={utilNav} />
        </nav>

        <div className="sidebar-footer">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setDark(!dark)}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? (
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
            {dark ? "Light mode" : "Dark mode"}
          </Button>
          <a href="/" className="back-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to app
          </a>
        </div>
      </aside>

      <main className="main">
        {children}
      </main>
    </div>
  );
}

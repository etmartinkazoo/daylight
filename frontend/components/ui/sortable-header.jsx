import { router } from "@inertiajs/react";
import { cn } from "@/lib/utils.js";

export function SortableHeader({ column, label, sort_column, sort_direction, className }) {
  const isActive = sort_column === column;

  function handleClick() {
    const nextDir = isActive && sort_direction === "asc" ? "desc" : "asc";
    const url = new URL(window.location.href);
    url.searchParams.set("sort", column);
    url.searchParams.set("direction", nextDir);
    router.get(url.pathname, Object.fromEntries(url.searchParams), {
      preserveScroll: true,
      replace: true,
    });
  }

  return (
    <button
      className={cn(
        "inline-flex items-center gap-1 bg-transparent border-none p-0 font-[inherit] text-sm font-medium cursor-pointer select-none whitespace-nowrap transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={handleClick}
    >
      {label}
      {isActive && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          {sort_direction === "asc" ? (
            <path d="M6 2.5L9.5 7H2.5L6 2.5Z" fill="currentColor" />
          ) : (
            <path d="M6 9.5L2.5 5H9.5L6 9.5Z" fill="currentColor" />
          )}
        </svg>
      )}
    </button>
  );
}

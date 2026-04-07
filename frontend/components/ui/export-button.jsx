import { useState } from "react";

export function ExportButton({ baseUrl = "" }) {
  const [open, setOpen] = useState(false);

  function handleExport(format) {
    const sep = baseUrl.includes("?") ? "&" : "?";
    window.open(`${baseUrl}${sep}format=${format}`, "_blank");
    setOpen(false);
  }

  return (
    <div className="relative inline-flex" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <button
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-fg-tertiary)] cursor-pointer hover:bg-[var(--color-surface)] transition-colors font-[inherit]"
        onClick={() => setOpen((o) => !o)}
      >
        Export
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 4 5 6.5 7.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-[var(--shadow-md)] z-10 min-w-[6rem] overflow-hidden">
          {["csv", "json"].map((fmt) => (
            <button
              key={fmt}
              className="block w-full px-4 py-2 text-xs font-medium text-left text-[var(--color-fg-tertiary)] cursor-pointer bg-transparent border-none hover:bg-[var(--color-surface)] transition-colors font-[inherit]"
              onClick={() => handleExport(fmt)}
            >
              {fmt.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

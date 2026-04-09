import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

export function ExportButton({ baseUrl = "" }) {
  const [open, setOpen] = useState(false);

  function handleExport(format) {
    const sep = baseUrl.includes("?") ? "&" : "?";
    window.open(`${baseUrl}${sep}format=${format}`, "_blank");
    setOpen(false);
  }

  return (
    <div
      className="relative inline-flex"
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
    >
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        Export
        <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-popover border rounded-md shadow-md z-10 min-w-[6rem] overflow-hidden p-1">
          {["csv", "json"].map((fmt) => (
            <Button
              key={fmt}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => handleExport(fmt)}
            >
              {fmt.toUpperCase()}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

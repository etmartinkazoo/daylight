import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import InputError from "@/components/input-error";
import { timeAgo } from "@/lib/formatters.js";

/**
 * A labeled form field with optional hint, error, and saved state indicator.
 */
export function FormField({ label, hint, error, children, htmlFor, saved, savedAt }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        {htmlFor ? <Label htmlFor={htmlFor}>{label}</Label> : <span className="text-sm font-medium leading-none">{label}</span>}
        {saved && (
          <Badge variant="secondary" className="text-xs gap-1">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3.5 8.5l3 3 6-6"/></svg>
            Saved{savedAt && <> &middot; {timeAgo(savedAt)}</>}
          </Badge>
        )}
      </div>
      {children}
      <InputError messages={error} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

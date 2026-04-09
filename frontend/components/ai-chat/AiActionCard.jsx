import { Button } from "@/components/ui/button";
import { actionLabel } from "./utils.js";

export default function AiActionCard({ action, executing = false, result = null, onExecute }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground capitalize">{action.type.replace(/_/g, " ")}</span>
        <span className="text-muted-foreground">{actionLabel(action)}</span>
      </div>
      {result ? (
        <span className={`text-sm shrink-0 ${result.success ? "text-green-600" : "text-destructive"}`}>
          {result.success ? result.message : result.error}
        </span>
      ) : (
        <Button size="xs" disabled={executing} onClick={() => onExecute?.(action)}>
          {executing ? "Running..." : "Approve"}
        </Button>
      )}
    </div>
  );
}

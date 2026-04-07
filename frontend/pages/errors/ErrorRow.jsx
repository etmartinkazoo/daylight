import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const statusVariant = { open: "destructive", resolved: "secondary", ignored: "outline" };

export default function ErrorRow({ error, selected = false, onSelect, onOpen, onStatusChange }) {
  return (
    <tr className={selected ? "selected" : ""}>
      <td onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={onSelect} />
      </td>
      <td>
        <button className="cell-btn" onClick={onOpen}>
          <strong className="font-mono text-sm">{error.error_class}</strong>
          {error.severity === "performance" ? (
            <span className="text-xs text-muted-foreground">
              avg: {error.avg_duration_ms ?? "—"}ms, max: {error.max_duration_ms ?? "—"}ms, exceeded: {error.exceeded_count ?? 0} times
            </span>
          ) : (
            <span className="text-xs text-muted-foreground truncate">{error.message}</span>
          )}
        </button>
      </td>
      <td style={{ textAlign: "center" }}>
        <Badge variant="secondary">{error.occurrences_count}</Badge>
        {error.affected_users_count > 0 && (
          <span className="users ml-1 text-xs text-muted-foreground inline-flex items-center gap-0.5">
            <HugeiconsIcon icon={UserIcon} size={10} />
            {error.affected_users_count}
          </span>
        )}
      </td>
      <td>
        <Badge variant={statusVariant[error.status] || "outline"}>{error.status}</Badge>
      </td>
      <td>
        <span className="text-xs text-muted-foreground">{error.last_seen_ago}</span>
      </td>
      <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
        {error.status === "open" ? (
          <Button variant="outline" size="sm" onClick={() => onStatusChange(error.id, "resolved")}>Resolve</Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => onStatusChange(error.id, "open")}>Reopen</Button>
        )}
      </td>
    </tr>
  );
}

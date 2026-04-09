import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TableRow, TableCell } from "@/components/ui/table";

const statusVariant = { open: "destructive", resolved: "secondary", ignored: "outline" };

export default function ErrorRow({ error, selected = false, onSelect, onOpen, onStatusChange }) {
  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      className="cursor-pointer"
      onClick={onOpen}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onSelect} />
      </TableCell>

      <TableCell>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-sm font-semibold">{error.error_class}</span>
          {error.severity === "performance" ? (
            <span className="text-sm text-muted-foreground">
              avg: {error.avg_duration_ms ?? "—"}ms · max: {error.max_duration_ms ?? "—"}ms · exceeded: {error.exceeded_count ?? 0}×
            </span>
          ) : (
            <span className="text-sm text-muted-foreground truncate max-w-xs">{error.message}</span>
          )}
        </div>
      </TableCell>

      <TableCell className="text-center">
        <Badge variant="secondary">{error.occurrences_count}</Badge>
        {error.affected_users_count > 0 && (
          <span className="ml-1 text-sm text-muted-foreground inline-flex items-center gap-0.5">
            <HugeiconsIcon icon={UserIcon} size={10} />
            {error.affected_users_count}
          </span>
        )}
      </TableCell>

      <TableCell>
        <Badge variant={statusVariant[error.status] || "outline"}>{error.status}</Badge>
      </TableCell>

      <TableCell>
        <span className="text-sm text-muted-foreground">{error.last_seen_ago}</span>
      </TableCell>

      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        {error.status === "open" ? (
          <Button variant="outline" size="sm" onClick={() => onStatusChange(error.id, "resolved")}>Resolve</Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => onStatusChange(error.id, "open")}>Reopen</Button>
        )}
      </TableCell>
    </TableRow>
  );
}

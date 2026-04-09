import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TableRow, TableCell } from "@/components/ui/table";

export default function ErrorRow({
  error,
  selected = false,
  onSelect,
  onOpen,
  onStatusChange,
}) {
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
          <span className="font-mono text-sm font-semibold">
            {error.error_class}
          </span>
          <span className="text-sm text-muted-foreground truncate max-w-xs">
            {error.message}
          </span>
        </div>
      </TableCell>

      <TableCell className="text-center">
        <Badge variant="secondary">{error.occurrences_count}</Badge>
      </TableCell>

      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        {error.status === "open" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatusChange(error.id, "resolved")}
          >
            Resolve
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatusChange(error.id, "open")}
          >
            Reopen
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

import { Form, usePage } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TableRow, TableCell } from "@/components/ui/table";

export default function ErrorRow({
  error,
  selected = false,
  onSelect,
  onOpen,
  returnStatus = "open",
}) {
  const { props } = usePage();
  const base = props?.base_path || "/daylight";

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
          <Form method="patch" action={`${base}/errors/${error.id}`} data={{ status: "resolved", return_status: returnStatus }} className="inline">
            {() => <Button type="submit" variant="outline" size="sm">Resolve</Button>}
          </Form>
        ) : (
          <Form method="patch" action={`${base}/errors/${error.id}`} data={{ status: "open", return_status: returnStatus }} className="inline">
            {() => <Button type="submit" variant="outline" size="sm">Reopen</Button>}
          </Form>
        )}
      </TableCell>
    </TableRow>
  );
}

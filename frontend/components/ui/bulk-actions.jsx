import { Button } from "@/components/ui/button";

export function BulkActions({ count, actions = [], onCancel }) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-accent border rounded-xl">
      <span className="text-sm font-semibold">{count} selected</span>
      <div className="flex items-center gap-2 ml-auto">
        {actions.map((action, i) => (
          <Button
            key={i}
            size="sm"
            variant={action.variant === "danger" ? "destructive" : "outline"}
            onClick={action.onclick}
          >
            {action.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

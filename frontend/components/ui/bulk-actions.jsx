import { Form } from "@inertiajs/react";
import { Button } from "@/components/ui/button";

export function BulkActions({ count, actions = [], batchUrl, selectedIds = [], returnStatus, onCancel }) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-accent border rounded-xl">
      <span className="text-sm font-semibold">{count} selected</span>
      <div className="flex items-center gap-2 ml-auto">
        {actions.map((action, i) => (
          <Form key={i} method="post" action={batchUrl} data={{ ids: selectedIds, action_type: action.action_type, return_status: returnStatus }} options={{ onSuccess: onCancel }} className="inline">
            {() => (
              <Button
                type="submit"
                size="sm"
                variant={action.variant === "danger" ? "destructive" : "outline"}
              >
                {action.label}
              </Button>
            )}
          </Form>
        ))}
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

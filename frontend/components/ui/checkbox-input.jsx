import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function CheckboxInput({ name, checked, onCheckedChange, label, className, disabled }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input type="hidden" name={name} value={checked ? "true" : "false"} />
      <Checkbox
        id={name}
        checked={!!checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
      {label && (
        <label htmlFor={name} className="text-sm leading-none cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  );
}

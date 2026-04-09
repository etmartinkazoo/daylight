import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// options: Array<{ value, label } | { group: string, options: [{ value, label }] }>
export function SelectInput({ name, value, onValueChange, options = [], placeholder, className, disabled }) {
  return (
    <>
      <input type="hidden" name={name} value={value ?? ""} />
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={cn("w-full", className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) =>
            opt.group ? (
              <SelectGroup key={opt.group}>
                <SelectLabel>{opt.group}</SelectLabel>
                {opt.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectGroup>
            ) : (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            )
          )}
        </SelectContent>
      </Select>
    </>
  );
}

import { useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export function DatePickerInput({ name, value, onChange, placeholder = "Pick a date", className, disabled }) {
  const [open, setOpen] = useState(false);
  const date = value ? parseISO(value) : undefined;
  const validDate = date && isValid(date) ? date : undefined;

  function handleSelect(d) {
    onChange?.(d ? format(d, "yyyy-MM-dd") : "");
    setOpen(false);
  }

  return (
    <>
      <input type="hidden" name={name} value={value ?? ""} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!validDate}
            className={cn(
              "w-[212px] justify-between text-left font-normal data-[empty=true]:text-muted-foreground",
              className
            )}
          >
            {validDate ? format(validDate, "PPP") : <span>{placeholder}</span>}
            <HugeiconsIcon icon={Calendar01Icon} className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={validDate}
            onSelect={handleSelect}
            defaultMonth={validDate}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}

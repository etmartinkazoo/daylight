import { Link } from "@inertiajs/react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const OPTIONS = [
  { value: "1h", label: "1h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

export default function PeriodSelect({ value = "24h", href, params = {} }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      value={value}
    >
      {OPTIONS.map((opt) => (
        <ToggleGroupItem key={opt.value} value={opt.value} asChild>
          <Link href={href} data={{ ...params, period: opt.value }} preserveState replace>
            {opt.label}
          </Link>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

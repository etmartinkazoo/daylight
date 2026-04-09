import { Button } from "@/components/ui/button";

export default function SuggestionsBar({ suggestions = [], onSelect }) {
  if (suggestions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {suggestions.map((s, i) => (
        <Button key={i} variant="outline" size="xs" className="rounded-full font-normal" onClick={() => onSelect?.(s)}>
          {s}
        </Button>
      ))}
    </div>
  );
}

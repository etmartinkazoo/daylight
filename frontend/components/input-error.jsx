import { cn } from "@/lib/utils";

export default function InputError({ messages, className }) {
  if (!messages) return null;
  const list = Array.isArray(messages) ? messages : [messages];
  if (list.length === 0) return null;

  return (
    <p className={cn("text-sm text-destructive", className)}>
      {list.join(", ")}
    </p>
  );
}

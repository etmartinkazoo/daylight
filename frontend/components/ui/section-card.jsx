import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

/**
 * A titled card section for settings and form layouts.
 */
export function SectionCard({ title, description, children }) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-5 flex flex-col gap-5">
        {children}
      </CardContent>
    </Card>
  );
}

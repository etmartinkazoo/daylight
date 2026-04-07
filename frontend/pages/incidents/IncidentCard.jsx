import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const severityVariant = { critical: "destructive", warning: "outline", info: "secondary" };
const statusVariant = { open: "destructive", investigating: "outline", resolved: "secondary", false_alarm: "ghost" };

export default function IncidentCard({ incident, onClick }) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-sm transition-shadow ${incident.severity === "critical" ? "border-destructive/50" : ""}`}
      onClick={onClick}
    >
      <CardContent className="flex gap-0 p-0">
        <div className={`w-1 rounded-l-xl shrink-0 ${incident.severity === "critical" ? "bg-destructive" : incident.severity === "warning" ? "bg-amber-500" : "bg-blue-500"}`} />
        <div className="flex flex-col gap-2 p-4 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={severityVariant[incident.severity] || "secondary"}>{incident.severity}</Badge>
              {incident.incident_type && <Badge variant="outline">{incident.incident_type}</Badge>}
              <Badge variant={statusVariant[incident.status] || "secondary"}>
                {incident.status === "investigating" && (
                  <span className="mr-1 size-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                )}
                {incident.status === "false_alarm" ? "False Alarm" : incident.status}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{incident.started_at_ago}</span>
          </div>
          <h3 className="text-sm font-semibold">{incident.title}</h3>
          {incident.summary && <p className="text-xs text-muted-foreground line-clamp-2">{incident.summary}</p>}
          <div className="flex items-center">
            {incident.status === "investigating" ? (
              <span className="text-xs text-amber-600 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                Investigating...
              </span>
            ) : incident.investigation ? (
              <span className="text-xs text-muted-foreground">View Report &rarr;</span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {incident.started_at ? new Date(incident.started_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

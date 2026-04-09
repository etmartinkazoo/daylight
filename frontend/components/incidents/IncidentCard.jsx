import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

const statusLabel = {
  open: "Open",
  investigating: "Investigating",
  resolved: "Resolved",
  false_alarm: "False Alarm",
};
const statusBadge = {
  open: "destructive",
  investigating: "outline",
  resolved: "secondary",
  false_alarm: "secondary",
};
const severityBadge = {
  critical: "destructive",
  warning: "outline",
  info: "secondary",
};

const borderColor = {
  open: "border-destructive",
  investigating: "border-amber-500",
  resolved: "border-border",
  false_alarm: "border-border",
};

export default function IncidentCard({ incident, onClick }) {
  return (
    <Card
      size="sm"
      className={`cursor-pointer border ${borderColor[incident.status] || ""}`}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle>{incident.title}</CardTitle>
        <CardAction>
          <span className="text-muted-foreground">
            {incident.started_at_ago}
          </span>
        </CardAction>
        <CardDescription>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={severityBadge[incident.severity] || "secondary"}>
              {incident.severity}
            </Badge>
            {incident.incident_type && (
              <Badge variant="outline">{incident.incident_type}</Badge>
            )}
            <Badge variant={statusBadge[incident.status] || "secondary"}>
              {statusLabel[incident.status] || incident.status}
            </Badge>
          </div>
          {incident.summary && (
            <p className="mt-1 line-clamp-2">{incident.summary}</p>
          )}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <span className="text-muted-foreground">
          {incident.started_at
            ? new Date(incident.started_at).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </span>
      </CardFooter>
    </Card>
  );
}

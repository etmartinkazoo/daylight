export function DonutChart({ segments = [], size = 120, strokeWidth = 14, centerLabel = "", centerValue = "" }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  const arcs = (() => {
    if (total === 0) return [];
    const r = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * r;
    let offset = 0;
    return segments
      .filter((s) => s.value > 0)
      .map((s) => {
        const pct = s.value / total;
        const len = pct * circumference;
        const gap = 2;
        const arc = {
          r, color: s.color, label: s.label, value: s.value,
          pct: Math.round(pct * 100),
          dasharray: `${Math.max(len - gap, 0)} ${circumference - Math.max(len - gap, 0)}`,
          dashoffset: -offset,
        };
        offset += len;
        return arc;
      });
  })();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={(size - strokeWidth) / 2}
          fill="none" stroke="var(--color-accent)" strokeWidth={strokeWidth}
        />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={size / 2} cy={size / 2} r={arc.r}
            fill="none" stroke={arc.color} strokeWidth={strokeWidth}
            strokeDasharray={arc.dasharray}
            strokeDashoffset={arc.dashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "opacity 0.2s" }}
          />
        ))}
        {centerValue && (
          <>
            <text x={size / 2} y={size / 2 - 4} textAnchor="middle"
              style={{ fontSize: "1.25rem", fontWeight: 700, fill: "var(--color-fg-secondary)", fontFamily: "inherit" }}>
              {centerValue}
            </text>
            <text x={size / 2} y={size / 2 + 12} textAnchor="middle"
              style={{ fontSize: "0.625rem", fontWeight: 500, fill: "var(--color-muted-light)", fontFamily: "inherit", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {centerLabel}
            </text>
          </>
        )}
      </svg>
      {arcs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {arcs.map((arc, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem" }}>
              <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: arc.color, flexShrink: 0 }} />
              <span style={{ color: "var(--color-muted)" }}>{arc.label}</span>
              <span style={{ fontWeight: 600, color: "var(--color-fg-secondary)", marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{arc.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

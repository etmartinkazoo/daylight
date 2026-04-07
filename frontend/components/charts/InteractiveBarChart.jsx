import { useState, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart.jsx";

export function InteractiveBarChart({
  data = [],
  series = [],
  title = "",
  description = "",
  height = 250,
  valueFormatter = (v) => v.toLocaleString(),
}) {
  const [activeKey, setActiveKey] = useState(series[0]?.key || "");

  const config = useMemo(() =>
    Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }])),
    [series],
  );

  const totals = useMemo(() => {
    const t = {};
    for (const s of series) t[s.key] = data.reduce((sum, d) => sum + (d[s.key] || 0), 0);
    return t;
  }, [series, data]);

  const activeColor = series.find((s) => s.key === activeKey)?.color || "#3b82f6";

  function formatXLabel(t) {
    try {
      const d = new Date(t);
      const diffH = (Date.now() - d) / 3600000;
      return diffH < 48
        ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch { return t; }
  }

  if (data.length === 0) {
    return (
      <div className="dl-card" style={{ padding: "1.5rem" }}>
        <p style={{ textAlign: "center", color: "var(--color-muted-light)", fontSize: "0.875rem", margin: 0 }}>No data available</p>
      </div>
    );
  }

  return (
    <div className="dl-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          {title && <h3 style={{ fontSize: "0.9375rem", fontWeight: 650, color: "var(--color-fg)", margin: 0 }}>{title}</h3>}
          {description && <p style={{ fontSize: "0.8125rem", color: "var(--color-muted)", margin: "0.125rem 0 0" }}>{description}</p>}
        </div>
        {series.length > 1 && (
          <div style={{ display: "flex", gap: "0.25rem", background: "var(--color-accent)", borderRadius: "0.5rem", padding: "0.1875rem" }}>
            {series.map((s) => (
              <button
                key={s.key}
                onClick={() => setActiveKey(s.key)}
                style={{
                  padding: "0.3125rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, fontFamily: "inherit",
                  border: "none", borderRadius: "0.375rem", cursor: "pointer", transition: "all 0.15s",
                  background: activeKey === s.key ? "var(--color-bg)" : "transparent",
                  color: activeKey === s.key ? "var(--color-fg)" : "var(--color-muted)",
                  boxShadow: activeKey === s.key ? "var(--shadow-xs)" : "none",
                }}
              >
                {s.label}
                <span style={{ marginLeft: "0.375rem", opacity: 0.7 }}>
                  {valueFormatter(totals[s.key] || 0)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ChartContainer config={config} className="w-full" style={{ height }}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="t" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={formatXLabel} interval="preserveStartEnd" />
          <YAxis hide tickFormatter={valueFormatter} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(val) => valueFormatter(val)}
                labelFormatter={(label) => {
                  try {
                    return new Date(label).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                  } catch { return label; }
                }}
              />
            }
          />
          <Bar dataKey={activeKey} fill={activeColor} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

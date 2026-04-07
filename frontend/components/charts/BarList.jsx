export function BarList({ items = [], color = "#3b82f6", maxItems = 6, valueFormatter = (v) => String(v) }) {
  const display = items.slice(0, maxItems);
  const maxVal = Math.max(...display.map((i) => i.value), 1);

  if (display.length === 0) {
    return <p style={{ fontSize: "0.8125rem", color: "var(--color-muted-light)", textAlign: "center", padding: "1rem", margin: 0 }}>No data</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      {display.map((item, i) => (
        <div key={item.label + ":" + i} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ flex: 1, position: "relative", height: "1.75rem", background: "var(--color-surface)", borderRadius: "0.375rem", overflow: "hidden" }}>
            <div style={{
              position: "absolute", top: 0, left: 0, bottom: 0,
              width: `${Math.max((item.value / maxVal) * 100, 2)}%`,
              background: item.color || color,
              borderRadius: "0.375rem",
              opacity: 0.15,
              transition: "width 0.5s ease",
            }} />
            <span style={{ position: "relative", zIndex: 1, padding: "0 0.625rem", fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-fg-secondary)", lineHeight: "1.75rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {item.label}
            </span>
          </div>
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-fg-secondary)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", minWidth: "3rem", textAlign: "right" }}>
            {valueFormatter(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

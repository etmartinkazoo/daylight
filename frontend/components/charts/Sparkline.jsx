import { useMemo } from "react";

export function Sparkline({ data = [], width = 120, height = 32, color = "#3b82f6" }) {
  const { linePath, areaPath, gradId } = useMemo(() => {
    if (data.length < 2) return {};
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;
    const padX = 1, padY = 2;
    const w = width - padX * 2;
    const h = height - padY * 2;
    const points = data.map((v, i) => ({
      x: padX + (i / (data.length - 1)) * w,
      y: padY + h - ((v - minVal) / range) * h,
    }));
    const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;
    const id = `spark-${color.replace("#", "")}`;
    return { linePath: line, areaPath: area, gradId: id };
  }, [data, width, height, color]);

  if (data.length < 2) return null;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.12" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

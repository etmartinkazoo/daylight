import { useMemo } from "react";
import { Area, AreaChart as RechartsAreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart.jsx";

export function AreaChart({
  data = [],
  series = [],
  height = 200,
  valueFormatter = (v) => v.toLocaleString(),
}) {
  const config = useMemo(() =>
    Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }])),
    [series],
  );

  if (!data.length) return null;

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RechartsAreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`agrad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.15} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="t" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis hide tickFormatter={valueFormatter} />
        <ChartTooltip content={<ChartTooltipContent formatter={(val) => valueFormatter(val)} />} />
        {series.map((s) => (
          <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={1.5} fill={`url(#agrad-${s.key})`} dot={false} />
        ))}
      </RechartsAreaChart>
    </ChartContainer>
  );
}

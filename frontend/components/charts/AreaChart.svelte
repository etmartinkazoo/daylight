<script>
  /**
   * Simple area/sparkline chart
   * @type {{ data?: number[], width?: number, height?: number, color?: string, showDots?: boolean, label?: string }}
   */
  let { data = [], width = 280, height = 60, color = "#3b82f6", showDots = false, label = "" } = $props();

  let maxVal = $derived(Math.max(...data, 1));
  let minVal = $derived(Math.min(...data, 0));
  let range = $derived(maxVal - minVal || 1);

  let points = $derived.by(() => {
    if (data.length < 2) return [];
    const padX = 2;
    const padY = 4;
    const w = width - padX * 2;
    const h = height - padY * 2;
    return data.map((v, i) => ({
      x: padX + (i / (data.length - 1)) * w,
      y: padY + h - ((v - minVal) / range) * h,
      value: v,
    }));
  });

  let linePath = $derived(
    points.length > 0
      ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
      : ""
  );

  let areaPath = $derived(
    linePath
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`
      : ""
  );
</script>

{#if data.length >= 2}
  <div class="area-chart">
    {#if label}<span class="chart-label">{label}</span>{/if}
    <svg {width} {height} viewBox="0 0 {width} {height}">
      <defs>
        <linearGradient id="area-grad-{color.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color={color} stop-opacity="0.2" />
          <stop offset="100%" stop-color={color} stop-opacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#area-grad-{color.replace('#','')})" />
      <path d={linePath} fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      {#if showDots}
        {#each points as p, i}
          {#if i === points.length - 1}
            <circle cx={p.x} cy={p.y} r="3" fill={color} />
            <circle cx={p.x} cy={p.y} r="5" fill={color} opacity="0.2" />
          {/if}
        {/each}
      {/if}
    </svg>
  </div>
{/if}

<style>
  .area-chart { display: flex; flex-direction: column; gap: 0.25rem; }
  .chart-label { font-size: 0.6875rem; color: var(--color-muted-light); font-weight: 500; }
</style>

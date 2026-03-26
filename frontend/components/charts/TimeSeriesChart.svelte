<script>
  /**
   * Interactive time-series chart with deploy markers
   * @type {{
   *   data?: { t: string, v: number }[],
   *   width?: number,
   *   height?: number,
   *   color?: string,
   *   label?: string,
   *   valueFormatter?: (v: number) => string,
   *   deploys?: { t: string, version: string }[],
   *   showArea?: boolean
   * }}
   */
  let {
    data = [],
    width = 600,
    height = 180,
    color = "#3b82f6",
    label = "",
    valueFormatter = String,
    deploys = [],
    showArea = true,
  } = $props();

  const padLeft = 48;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 28;

  let hoverIndex = $state(-1);

  let timestamps = $derived(data.map(d => new Date(d.t).getTime()));
  let values = $derived(data.map(d => d.v));

  let minTime = $derived(timestamps.length > 0 ? Math.min(...timestamps) : 0);
  let maxTime = $derived(timestamps.length > 0 ? Math.max(...timestamps) : 1);
  let timeRange = $derived(maxTime - minTime || 1);

  let maxVal = $derived(values.length > 0 ? Math.max(...values) : 1);
  let minVal = $derived(values.length > 0 ? Math.min(...values) : 0);
  let valRange = $derived(maxVal - minVal || 1);

  // Add 10% padding to y-axis
  let yMin = $derived(minVal - valRange * 0.05);
  let yMax = $derived(maxVal + valRange * 0.05);
  let yRange = $derived(yMax - yMin || 1);

  let chartW = $derived(width - padLeft - padRight);
  let chartH = $derived(height - padTop - padBottom);

  let gradId = $derived(`ts-grad-${color.replace('#', '')}`);

  function toX(time) {
    return padLeft + ((time - minTime) / timeRange) * chartW;
  }

  function toY(val) {
    return padTop + chartH - ((val - yMin) / yRange) * chartH;
  }

  let points = $derived.by(() => {
    if (data.length < 2) return [];
    return data.map((d, i) => ({
      x: toX(timestamps[i]),
      y: toY(d.v),
      t: d.t,
      v: d.v,
    }));
  });

  let linePath = $derived(
    points.length > 0
      ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
      : ""
  );

  let areaPath = $derived(
    linePath
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${padTop + chartH} L ${points[0].x.toFixed(1)} ${padTop + chartH} Z`
      : ""
  );

  // Y-axis grid lines: min, mid, max
  let yGridLines = $derived.by(() => {
    const min = minVal;
    const max = maxVal;
    const mid = (min + max) / 2;
    return [min, mid, max].map(v => ({
      y: toY(v),
      label: valueFormatter(Math.round(v * 100) / 100),
    }));
  });

  // X-axis labels: ~5 evenly spaced
  let xLabels = $derived.by(() => {
    if (timestamps.length < 2) return [];
    const count = Math.min(5, timestamps.length);
    const rangeMs = maxTime - minTime;
    const useTime = rangeMs < 86400000 * 2; // less than 2 days => show time
    const labels = [];
    for (let i = 0; i < count; i++) {
      const t = minTime + (i / (count - 1)) * timeRange;
      const d = new Date(t);
      let text;
      if (useTime) {
        text = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
      } else {
        text = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }
      labels.push({ x: toX(t), text });
    }
    return labels;
  });

  // Deploy marker positions
  let deployMarkers = $derived.by(() => {
    return deploys
      .map(d => {
        const t = new Date(d.t).getTime();
        if (t < minTime || t > maxTime) return null;
        return { x: toX(t), version: d.version };
      })
      .filter(Boolean);
  });

  function handleMouseMove(event) {
    if (points.length === 0) return;
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const mouseX = (event.clientX - rect.left) * scaleX;
    // Find closest point
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    hoverIndex = closest;
  }

  function handleMouseLeave() {
    hoverIndex = -1;
  }

  let hoverPoint = $derived(hoverIndex >= 0 && hoverIndex < points.length ? points[hoverIndex] : null);

  let tooltipTime = $derived.by(() => {
    if (!hoverPoint) return "";
    const d = new Date(hoverPoint.t);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    });
  });
</script>

{#if data.length >= 2}
  <div class="ts-chart">
    {#if label}<span class="chart-label">{label}</span>{/if}
    <svg
      {width}
      {height}
      viewBox="0 0 {width} {height}"
      class="chart-svg"
      onmousemove={handleMouseMove}
      onmouseleave={handleMouseLeave}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color={color} stop-opacity="0.18" />
          <stop offset="100%" stop-color={color} stop-opacity="0.02" />
        </linearGradient>
      </defs>

      <!-- Y-axis grid lines -->
      {#each yGridLines as gl}
        <line
          x1={padLeft} y1={gl.y} x2={width - padRight} y2={gl.y}
          stroke="var(--color-border)" stroke-width="1" stroke-dasharray="3 3"
        />
        <text x={padLeft - 6} y={gl.y + 3.5} text-anchor="end" class="axis-label">{gl.label}</text>
      {/each}

      <!-- X-axis labels -->
      {#each xLabels as xl}
        <text x={xl.x} y={height - 6} text-anchor="middle" class="axis-label">{xl.text}</text>
      {/each}

      <!-- Area fill -->
      {#if showArea && areaPath}
        <path d={areaPath} fill="url(#{gradId})" />
      {/if}

      <!-- Line -->
      {#if linePath}
        <path d={linePath} fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      {/if}

      <!-- Deploy markers -->
      {#each deployMarkers as dm}
        <line
          x1={dm.x} y1={padTop} x2={dm.x} y2={padTop + chartH}
          stroke="var(--color-danger)" stroke-width="1" stroke-dasharray="4 3"
        />
        <polygon
          points="{dm.x},{padTop - 2} {dm.x + 4},{padTop + 4} {dm.x},{padTop + 10} {dm.x - 4},{padTop + 4}"
          fill="var(--color-danger)"
        />
        <title>{dm.version}</title>
      {/each}

      <!-- Hover interaction -->
      {#if hoverPoint}
        <line
          x1={hoverPoint.x} y1={padTop} x2={hoverPoint.x} y2={padTop + chartH}
          stroke="var(--color-muted-light)" stroke-width="1"
        />
        <circle cx={hoverPoint.x} cy={hoverPoint.y} r="4" fill={color} />
        <circle cx={hoverPoint.x} cy={hoverPoint.y} r="6" fill={color} opacity="0.2" />
      {/if}
    </svg>

    <!-- Tooltip -->
    {#if hoverPoint}
      <div
        class="tooltip"
        style="left: {Math.min(Math.max(hoverPoint.x, 60), width - 60)}px"
      >
        <span class="tooltip-time">{tooltipTime}</span>
        <span class="tooltip-value">{valueFormatter(hoverPoint.v)}</span>
      </div>
    {/if}
  </div>
{/if}

<style>
  .ts-chart {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .chart-label {
    font-size: 0.6875rem;
    color: var(--color-muted);
    font-weight: 500;
  }

  .chart-svg {
    width: 100%;
    height: auto;
    cursor: crosshair;
  }

  .axis-label {
    font-size: 0.5625rem;
    fill: var(--color-muted);
    font-family: inherit;
    font-weight: 500;
  }

  .tooltip {
    position: absolute;
    bottom: 100%;
    transform: translateX(-50%);
    background: var(--color-fg);
    color: var(--color-bg);
    padding: 0.3125rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.6875rem;
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.125rem;
    pointer-events: none;
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.15);
    margin-bottom: 0.25rem;
  }

  .tooltip-time {
    opacity: 0.7;
    font-size: 0.625rem;
  }

  .tooltip-value {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
</style>

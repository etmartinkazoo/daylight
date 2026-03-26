<script>
  /**
   * Interactive bar chart with series tabs, hover highlight, and tooltip.
   * Vanilla SVG — no external chart libraries.
   *
   * @type {{
   *   data?: { t: string, [key: string]: any }[],
   *   series?: { key: string, label: string, color: string }[],
   *   title?: string,
   *   description?: string,
   *   height?: number,
   *   valueFormatter?: (v: number) => string,
   *   labelFormatter?: (t: string) => string
   * }}
   */
  let {
    data = [],
    series = [],
    title = "",
    description = "",
    height = 250,
    valueFormatter = (v) => v.toLocaleString(),
    labelFormatter,
  } = $props();

  let containerEl = $state(null);
  let containerWidth = $state(600);
  let activeKey = $state(series[0]?.key || "");
  let hoveredIdx = $state(-1);

  // Track active key when series changes
  $effect(() => {
    if (series.length > 0 && !series.find(s => s.key === activeKey)) {
      activeKey = series[0].key;
    }
  });

  // Resize observer
  $effect(() => {
    if (!containerEl) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        containerWidth = entry.contentRect.width;
      }
    });
    ro.observe(containerEl);
    return () => ro.disconnect();
  });

  let activeSeries = $derived(series.find(s => s.key === activeKey));
  let activeColor = $derived(activeSeries?.color || "#3b82f6");

  // Totals per series
  let totals = $derived.by(() => {
    const t = {};
    for (const s of series) {
      t[s.key] = data.reduce((sum, d) => sum + (d[s.key] || 0), 0);
    }
    return t;
  });

  // Chart geometry
  let padding = { top: 8, right: 8, bottom: 28, left: 8 };
  let chartWidth = $derived(Math.max(containerWidth - padding.left - padding.right, 100));
  let chartHeight = $derived(height - padding.top - padding.bottom);

  let maxVal = $derived.by(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => d[activeKey] || 0), 1);
  });

  let barGap = 2;
  let barWidth = $derived(data.length > 0 ? Math.max((chartWidth / data.length) - barGap, 1) : 10);

  let bars = $derived.by(() => {
    return data.map((d, i) => {
      const val = d[activeKey] || 0;
      const h = (val / maxVal) * chartHeight;
      return {
        x: padding.left + i * (barWidth + barGap),
        y: padding.top + chartHeight - h,
        width: barWidth,
        height: h,
        value: val,
        label: d.t,
        index: i,
      };
    });
  });

  // X-axis labels — show ~6 evenly spaced
  let xLabels = $derived.by(() => {
    if (data.length < 2) return [];
    const labels = [];
    const step = Math.max(Math.floor(data.length / 6), 1);
    for (let i = 0; i < data.length; i += step) {
      const d = data[i];
      labels.push({
        x: padding.left + i * (barWidth + barGap) + barWidth / 2,
        text: formatLabel(d.t),
      });
    }
    return labels;
  });

  function formatLabel(t) {
    if (labelFormatter) return labelFormatter(t);
    try {
      const d = new Date(t);
      const now = new Date();
      const diffH = (now - d) / 3600000;
      if (diffH < 48) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch { return t; }
  }

  function formatTooltipLabel(t) {
    try {
      const d = new Date(t);
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return t; }
  }

  // Tooltip position
  let tooltip = $derived.by(() => {
    if (hoveredIdx < 0 || hoveredIdx >= bars.length) return null;
    const bar = bars[hoveredIdx];
    const x = bar.x + bar.width / 2;
    const y = bar.y - 8;
    return { x, y, value: bar.value, label: bar.label };
  });
</script>

<div class="ibc">
  <!-- Header with series tabs -->
  <div class="ibc-header">
    <div class="ibc-title-area">
      {#if title}<h3 class="ibc-title">{title}</h3>{/if}
      {#if description}<p class="ibc-desc">{description}</p>{/if}
    </div>
    {#if series.length > 1}
      <div class="ibc-tabs">
        {#each series as s (s.key)}
          <button
            class="ibc-tab"
            class:active={activeKey === s.key}
            onclick={() => activeKey = s.key}
          >
            <span class="ibc-tab-label">{s.label}</span>
            <span class="ibc-tab-value">{valueFormatter(totals[s.key] || 0)}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Chart -->
  <div class="ibc-chart" bind:this={containerEl}>
    {#if data.length > 0}
      <svg
        width={containerWidth}
        {height}
        viewBox="0 0 {containerWidth} {height}"
        role="img"
        aria-label={title}
      >
        <!-- Grid lines -->
        {#each [0.25, 0.5, 0.75] as frac}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight * (1 - frac)}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight * (1 - frac)}
            stroke="var(--color-border)"
            stroke-dasharray="3,3"
            opacity="0.5"
          />
        {/each}

        <!-- Highlight band on hover -->
        {#if hoveredIdx >= 0 && hoveredIdx < bars.length}
          <rect
            x={bars[hoveredIdx].x - barGap / 2}
            y={padding.top}
            width={barWidth + barGap}
            height={chartHeight}
            fill="var(--color-accent)"
            rx="2"
          />
        {/if}

        <!-- Bars -->
        {#each bars as bar (bar.index)}
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={Math.max(bar.height, 0)}
            fill={activeColor}
            opacity={hoveredIdx === -1 || hoveredIdx === bar.index ? 1 : 0.4}
            rx={Math.min(barWidth / 4, 3)}
            class="ibc-bar"
          />
          <!-- Invisible hit area for hover -->
          <rect
            x={bar.x - barGap / 2}
            y={padding.top}
            width={barWidth + barGap}
            height={chartHeight}
            fill="transparent"
            onmouseenter={() => hoveredIdx = bar.index}
            onmouseleave={() => hoveredIdx = -1}
          />
        {/each}

        <!-- X-axis labels -->
        {#each xLabels as lbl}
          <text
            x={lbl.x}
            y={height - 4}
            text-anchor="middle"
            fill="var(--color-muted)"
            font-size="10"
            font-family="inherit"
          >{lbl.text}</text>
        {/each}

        <!-- Tooltip -->
        {#if tooltip}
          {@const tooltipW = 140}
          {@const tooltipH = 44}
          {@const tx = Math.min(Math.max(tooltip.x - tooltipW / 2, 4), containerWidth - tooltipW - 4)}
          {@const ty = Math.max(tooltip.y - tooltipH - 4, 4)}
          <g class="ibc-tooltip-g">
            <rect
              x={tx}
              y={ty}
              width={tooltipW}
              height={tooltipH}
              rx="6"
              fill="var(--color-fg)"
              opacity="0.95"
            />
            <text x={tx + 10} y={ty + 17} fill="var(--color-bg)" font-size="10" font-family="inherit" opacity="0.7">
              {formatTooltipLabel(tooltip.label)}
            </text>
            <text x={tx + 10} y={ty + 34} fill="var(--color-bg)" font-size="13" font-weight="600" font-family="inherit">
              {activeSeries?.label}: {valueFormatter(tooltip.value)}
            </text>
          </g>
        {/if}
      </svg>
    {:else}
      <div class="ibc-empty">No data</div>
    {/if}
  </div>
</div>

<style>
  .ibc {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .ibc-header {
    display: flex;
    align-items: stretch;
    border-bottom: 1px solid var(--color-border);
  }

  .ibc-title-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
    padding: 1rem 1.25rem;
  }

  .ibc-title {
    font-size: 0.9375rem;
    font-weight: 650;
    color: var(--color-fg);
    margin: 0;
  }

  .ibc-desc {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin: 0;
  }

  .ibc-tabs {
    display: flex;
  }

  .ibc-tab {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
    padding: 0.75rem 1.25rem;
    border: none;
    border-left: 1px solid var(--color-border);
    background: none;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s;
    min-width: 7rem;
  }

  .ibc-tab:hover {
    background: var(--color-surface);
  }

  .ibc-tab.active {
    background: var(--color-accent);
  }

  .ibc-tab-label {
    font-size: 0.6875rem;
    color: var(--color-muted);
  }

  .ibc-tab-value {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-fg);
    letter-spacing: -0.02em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }

  .ibc-chart {
    padding: 0.75rem 0.5rem 0.25rem;
  }

  .ibc-chart svg {
    display: block;
    width: 100%;
    cursor: crosshair;
  }

  .ibc-bar {
    transition: opacity 0.15s ease;
  }

  .ibc-tooltip-g {
    pointer-events: none;
  }

  .ibc-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 200px;
    font-size: 0.8125rem;
    color: var(--color-muted);
  }

  @media (max-width: 640px) {
    .ibc-header { flex-direction: column; }
    .ibc-tab { border-left: none; border-top: 1px solid var(--color-border); }
    .ibc-tab-value { font-size: 1rem; }
  }
</style>

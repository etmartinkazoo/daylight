<script>
  /**
   * @typedef {{ value: number, color: string, label: string }} Segment
   * @type {{ segments?: Segment[], size?: number, strokeWidth?: number, centerLabel?: string, centerValue?: string }}
   */
  let { segments = [], size = 120, strokeWidth = 14, centerLabel = "", centerValue = "" } = $props();

  let total = $derived(segments.reduce((sum, s) => sum + s.value, 0));

  let arcs = $derived.by(() => {
    if (total === 0) return [];
    const r = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * r;
    let offset = 0;
    return segments.filter(s => s.value > 0).map(s => {
      const pct = s.value / total;
      const len = pct * circumference;
      const gap = 2;
      const arc = {
        r,
        color: s.color,
        label: s.label,
        value: s.value,
        pct: Math.round(pct * 100),
        dasharray: `${Math.max(len - gap, 0)} ${circumference - Math.max(len - gap, 0)}`,
        dashoffset: -offset,
      };
      offset += len;
      return arc;
    });
  });
</script>

<div class="donut-chart">
  <svg width={size} height={size} viewBox="0 0 {size} {size}">
    <!-- Background circle -->
    <circle
      cx={size / 2} cy={size / 2} r={(size - strokeWidth) / 2}
      fill="none" stroke="var(--color-accent)" stroke-width={strokeWidth}
    />
    {#each arcs as arc}
      <circle
        cx={size / 2} cy={size / 2} r={arc.r}
        fill="none" stroke={arc.color} stroke-width={strokeWidth}
        stroke-dasharray={arc.dasharray}
        stroke-dashoffset={arc.dashoffset}
        stroke-linecap="round"
        transform="rotate(-90 {size / 2} {size / 2})"
        class="donut-arc"
      />
    {/each}
    {#if centerValue}
      <text x={size / 2} y={size / 2 - 4} text-anchor="middle" class="center-value">{centerValue}</text>
      <text x={size / 2} y={size / 2 + 12} text-anchor="middle" class="center-label">{centerLabel}</text>
    {/if}
  </svg>
  {#if arcs.length > 0}
    <div class="donut-legend">
      {#each arcs as arc}
        <div class="legend-item">
          <span class="legend-dot" style="background: {arc.color}"></span>
          <span class="legend-label">{arc.label}</span>
          <span class="legend-value">{arc.value}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .donut-chart { display: flex; align-items: center; gap: 1.25rem; }
  .donut-arc { transition: opacity 0.2s; }
  .donut-arc:hover { opacity: 0.8; }
  .center-value { font-size: 1.25rem; font-weight: 700; fill: var(--color-fg-secondary); font-family: inherit; }
  .center-label { font-size: 0.625rem; font-weight: 500; fill: var(--color-muted-light); font-family: inherit; text-transform: uppercase; letter-spacing: 0.05em; }
  .donut-legend { display: flex; flex-direction: column; gap: 0.375rem; }
  .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; }
  .legend-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; flex-shrink: 0; }
  .legend-label { color: var(--color-muted); }
  .legend-value { font-weight: 600; color: var(--color-fg-secondary); margin-left: auto; font-variant-numeric: tabular-nums; }
</style>

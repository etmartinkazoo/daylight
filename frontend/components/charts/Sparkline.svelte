<script>
  /**
   * Tiny inline sparkline for embedding in stat cards
   * @type {{ data?: number[], width?: number, height?: number, color?: string }}
   */
  let { data = [], width = 120, height = 32, color = "#3b82f6" } = $props();

  let maxVal = $derived(Math.max(...data, 1));
  let minVal = $derived(Math.min(...data, 0));
  let range = $derived(maxVal - minVal || 1);

  let gradId = $derived(`spark-grad-${color.replace('#', '')}`);

  let points = $derived.by(() => {
    if (data.length < 2) return [];
    const padX = 1;
    const padY = 2;
    const w = width - padX * 2;
    const h = height - padY * 2;
    return data.map((v, i) => ({
      x: padX + (i / (data.length - 1)) * w,
      y: padY + h - ((v - minVal) / range) * h,
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
  <svg class="sparkline" {width} {height} viewBox="0 0 {width} {height}">
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color={color} stop-opacity="0.12" />
        <stop offset="100%" stop-color={color} stop-opacity="0.01" />
      </linearGradient>
    </defs>
    <path d={areaPath} fill="url(#{gradId})" />
    <path d={linePath} fill="none" stroke={color} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
{/if}

<style>
  .sparkline {
    display: block;
    flex-shrink: 0;
  }
</style>

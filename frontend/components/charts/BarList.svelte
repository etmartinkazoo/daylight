<script>
  /**
   * @typedef {{ label: string, value: number, href?: string, color?: string, suffix?: string }} BarItem
   * @type {{ items?: BarItem[], color?: string, maxItems?: number, valueFormatter?: (v: number) => string }}
   */
  let { items = [], color = "#3b82f6", maxItems = 6, valueFormatter = (v) => String(v) } = $props();

  let displayItems = $derived(items.slice(0, maxItems));
  let maxVal = $derived(Math.max(...displayItems.map(i => i.value), 1));
</script>

<div class="bar-list">
  {#each displayItems as item, i (item.label + ':' + i)}
    <div class="bar-item">
      <div class="bar-bg">
        <div
          class="bar-fill"
          style="width: {Math.max((item.value / maxVal) * 100, 2)}%; background: {item.color || color};"
        ></div>
        <span class="bar-label">{item.label}</span>
      </div>
      <span class="bar-value">{valueFormatter(item.value)}</span>
    </div>
  {/each}
  {#if items.length === 0}
    <p class="bar-empty">No data</p>
  {/if}
</div>

<style>
  .bar-list { display: flex; flex-direction: column; gap: 0.375rem; }
  .bar-item { display: flex; align-items: center; gap: 0.75rem; }
  .bar-bg {
    flex: 1;
    position: relative;
    height: 1.75rem;
    background: #f8fafc;
    border-radius: 0.375rem;
    overflow: hidden;
  }
  .bar-fill {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    border-radius: 0.375rem;
    opacity: 0.15;
    transition: width 0.5s ease;
  }
  .bar-label {
    position: relative;
    z-index: 1;
    padding: 0 0.625rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #1e293b;
    line-height: 1.75rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bar-value {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #1e293b;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    min-width: 3rem;
    text-align: right;
  }
  .bar-empty {
    font-size: 0.8125rem;
    color: #94a3b8;
    text-align: center;
    padding: 1rem;
    margin: 0;
  }
</style>

<script>
  let { value = "24h", onchange } = $props();
  const options = [
    { value: "1h", label: "1h" },
    { value: "24h", label: "24h" },
    { value: "7d", label: "7d" },
    { value: "30d", label: "30d" },
  ];
</script>

<div class="period-select">
  {#each options as opt (opt.value)}
    <button
      class="period-btn"
      class:active={value === opt.value}
      onclick={() => onchange(opt.value)}
    >{opt.label}</button>
  {/each}
</div>

<style>
  .period-select {
    display: flex;
    background: #f1f5f9;
    border-radius: 0.5rem;
    padding: 0.1875rem;
    gap: 0.125rem;
  }

  .period-btn {
    padding: 0.3125rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: inherit;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover { color: #0f172a; }
    &.active {
      background: #fff;
      color: #0f172a;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
    }
  }
</style>

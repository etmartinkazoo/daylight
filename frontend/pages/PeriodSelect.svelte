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
  .period-select { display: flex; gap: 1px; }

  .period-btn {
    padding: 0.3125rem 0.625rem;
    font-size: 0.6875rem;
    font-weight: 600;
    font-family: inherit;
    border: 1px solid #d1d5db;
    border-radius: 0;
    background: #fff;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.1s;

    &:hover { background: #f3f4f6; }
    &.active { background: #213258; color: #fff; border-color: #213258; }
  }
</style>

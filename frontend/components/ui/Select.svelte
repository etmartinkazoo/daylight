<script>
let {
  name,
  id,
  value = $bindable(""),
  options = [],
  placeholder = "Select...",
  disabled = false,
  required = false,
} = $props();
</script>

<div class="select-wrap">
  <select
    {name}
    {id}
    bind:value
    {disabled}
    {required}
    class="select"
  >
    {#if placeholder}
      <option value="" disabled>{placeholder}</option>
    {/if}
    {#each options as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
  <span class="select-chevron"></span>
</div>

<style>
  .select-wrap {
    position: relative;
    width: 100%;
  }

  .select-chevron {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.25rem;
    height: 1.25rem;
    pointer-events: none;
    background: var(--color-muted);
    -webkit-mask-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
    mask-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='black' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
    -webkit-mask-size: contain;
    mask-size: contain;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }

  .select {
    width: 100%;
    height: 2.375rem;
    padding: 0 2.25rem 0 0.75rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    color: var(--color-fg);
    outline: none;
    appearance: none;
    box-shadow: var(--shadow-sm);
    transition: border-color var(--duration-normal) var(--ease-default), box-shadow var(--duration-normal) var(--ease-default);
    cursor: pointer;

    &:hover:not(:disabled):not(:focus) {
      border-color: var(--color-muted);
    }

    &:focus {
      border-color: var(--color-focus);
      box-shadow: 0 0 0 3px var(--color-focus-ring);
    }

    &:disabled {
      opacity: var(--disabled-opacity);
      cursor: not-allowed;
      background-color: var(--color-accent);
    }
  }
</style>

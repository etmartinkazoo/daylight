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

<style>
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
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1.25rem;
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

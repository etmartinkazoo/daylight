<script>
let {
  checked = $bindable(false),
  onchange,
  disabled = false,
  name,
  value,
  id,
  ...rest
} = $props();

function handleChange(e) {
  checked = e.target.checked;
  onchange?.(e);
}
</script>

<input
  type="checkbox"
  class="checkbox"
  {checked}
  onchange={handleChange}
  {disabled}
  {name}
  {value}
  {id}
  {...rest}
/>

<style>
  .checkbox {
    width: 1.125rem;
    height: 1.125rem;
    border: 1.5px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    accent-color: var(--color-primary);
    flex-shrink: 0;
    transition: border-color 0.15s ease;

    &:hover:not(:disabled) {
      border-color: var(--color-primary);
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-focus);
    }

    &:disabled {
      opacity: var(--disabled-opacity);
      cursor: not-allowed;
    }
  }
</style>

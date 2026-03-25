<script>
let {
  type = "text",
  name,
  id,
  value = $bindable(""),
  placeholder,
  required = false,
  disabled = false,
  ...rest
} = $props();
</script>

<input
  class="input"
  {type}
  {name}
  {id}
  bind:value
  {placeholder}
  {required}
  {disabled}
  {...rest}
/>

<style>
  .input {
    width: 100%;
    height: 2.375rem;
    padding: 0 0.75rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
    color: var(--color-fg);
    outline: none;
    box-shadow: var(--shadow-sm);
    transition: border-color var(--duration-normal) var(--ease-default), box-shadow var(--duration-normal) var(--ease-default);

    &::placeholder {
      color: var(--color-muted);
    }

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
      background: var(--color-accent);
    }
  }
</style>

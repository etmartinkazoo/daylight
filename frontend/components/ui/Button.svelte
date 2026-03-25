<script>
let {
  type = "button",
  variant = "primary",
  size = "default",
  disabled = false,
  onclick,
  children,
  ...rest
} = $props();
</script>

<button {type} class="btn btn-{variant} btn-{size}" {disabled} {onclick} {...rest}>
  {@render children()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1.25rem;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    cursor: pointer;
    white-space: nowrap;
    transition: background var(--duration-normal) var(--ease-default), color var(--duration-normal) var(--ease-default), border-color var(--duration-normal) var(--ease-default), box-shadow var(--duration-normal) var(--ease-default);
    letter-spacing: -0.01em;

    &:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }

    &:disabled {
      opacity: var(--disabled-opacity);
      cursor: not-allowed;
      pointer-events: none;
    }
  }

  .btn-default {
    padding: 0.5rem 1rem;
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }

  .btn-lg {
    padding: 0.625rem 1.25rem;
    font-size: 0.9375rem;
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--color-primary-fg);
    border-color: var(--color-primary);
    box-shadow: var(--shadow-xs);

    &:hover:not(:disabled) {
      background: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
      box-shadow: var(--shadow-sm);
    }

    &:active:not(:disabled) {
      transform: translateY(0.5px);
    }
  }

  .btn-danger {
    background: var(--color-danger);
    color: var(--color-primary-fg);
    border-color: var(--color-danger);
    box-shadow: var(--shadow-xs);

    &:hover:not(:disabled) {
      background: var(--color-danger-hover);
      border-color: var(--color-danger-hover);
      box-shadow: var(--shadow-sm);
    }

    &:active:not(:disabled) {
      transform: translateY(0.5px);
    }
  }

  .btn-ghost {
    background: transparent;
    color: var(--color-fg);
    border-color: transparent;

    &:hover:not(:disabled) {
      background: var(--color-accent);
    }

    &:active:not(:disabled) {
      transform: translateY(0.5px);
    }
  }

  .btn-danger-ghost {
    background: transparent;
    color: var(--color-danger);
    border-color: transparent;

    &:hover:not(:disabled) {
      background: var(--color-danger-subtle);
    }

    &:active:not(:disabled) {
      transform: translateY(0.5px);
    }
  }

  .btn-outline {
    background: var(--color-bg);
    color: var(--color-fg);
    border-color: var(--color-border);
    box-shadow: var(--shadow-xs);

    &:hover:not(:disabled) {
      background: var(--color-accent);
      border-color: var(--color-input-border);
    }

    &:active:not(:disabled) {
      transform: translateY(0.5px);
    }
  }
</style>

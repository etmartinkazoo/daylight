<script>
let {
  open = $bindable(false),
  title = "",
  description = "",
  size = "default", // "default" or "lg"
  children,
} = $props();

function close() {
  open = false;
}

$effect(() => {
  if (!open) return;
  function handleKeydown(e) {
    if (e.key === "Escape") close();
  }
  window.addEventListener("keydown", handleKeydown);
  return () => window.removeEventListener("keydown", handleKeydown);
});
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="dialog-backdrop" onclick={close}></div>
  <div class="dialog-panel" class:dialog-lg={size === "lg"} role="dialog" aria-modal="true" aria-label={title}>
    <div class="dialog-header">
      <div>
        <h3 class="dialog-title">{title}</h3>
        {#if description}
          <p class="dialog-description">{description}</p>
        {/if}
      </div>
      <button class="dialog-close" onclick={close} aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="dialog-body">
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    background: var(--backdrop-color);
    backdrop-filter: var(--backdrop-blur);
    z-index: var(--z-modal-backdrop);
    animation: fade-in var(--duration-slow) var(--ease-spring);
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .dialog-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    max-width: 37.5rem;
    max-height: 85vh;
    background: var(--color-bg);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    border: 1px solid var(--color-border);
    z-index: var(--z-modal);
    display: flex;
    flex-direction: column;
    animation: dialog-in var(--duration-slow) var(--ease-spring);
  }

  @media (max-width: 768px) {
    .dialog-panel {
      width: calc(100% - 2rem);
    }
  }

  @keyframes dialog-in {
    from { opacity: 0; transform: translate(-50%, -48%) scale(0.96); }
    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }

  .dialog-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 1.5rem 1.5rem 0;
    flex-shrink: 0;
    gap: 1rem;
  }

  .dialog-title {
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: -0.015em;
    color: var(--color-fg);
  }

  .dialog-description {
    font-size: 0.8125rem;
    color: var(--color-muted);
    margin-top: 0.25rem;
    line-height: 1.5;
  }

  .dialog-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    background: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--color-muted);
    flex-shrink: 0;
    transition: background 0.15s ease, color 0.15s ease;

    &:hover {
      background: var(--color-accent);
      color: var(--color-fg);
    }

    &:focus-visible {
      outline: none;
      box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-focus);
    }
  }

  .dialog-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .dialog-lg {
    max-width: 48rem;
    max-height: 90vh;
  }
</style>

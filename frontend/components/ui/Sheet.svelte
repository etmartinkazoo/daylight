<script>
let { open = $bindable(false), title = "", children } = $props();

function close() {
  open = false;
}

$effect(() => {
  if (!open) return;
  function onKey(e) {
    if (e.key === "Escape") close();
  }
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
});
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="sheet-backdrop" onclick={close}></div>
  <div class="sheet-panel" role="dialog" aria-modal="true" aria-label={title}>
    <div class="sheet-header">
      <h3 class="sheet-title">{title}</h3>
      <button class="sheet-close" onclick={close} aria-label="Close">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="sheet-body">
      {@render children()}
    </div>
  </div>
{/if}

<style>
  .sheet-backdrop {
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

  .sheet-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-width: 40rem;
    background: var(--color-bg);
    z-index: var(--z-modal);
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-xl);
    border-left: none;
    animation: slide-in var(--duration-slow) var(--ease-spring);
  }

  @media (max-width: 768px) {
    .sheet-panel {
      max-width: none;
      width: 90vw;
    }
  }

  @keyframes slide-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .sheet-title {
    font-size: 1.0625rem;
    font-weight: 600;
    letter-spacing: -0.015em;
  }

  .sheet-close {
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

  .sheet-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }
</style>

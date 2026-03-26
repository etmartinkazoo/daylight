<script>
  /**
   * Dropdown button for CSV/JSON export
   * @type {{ baseUrl?: string }}
   */
  let { baseUrl = "" } = $props();

  let open = $state(false);

  function handleExport(format) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    window.open(`${baseUrl}${separator}format=${format}`, '_blank');
    open = false;
  }

  function handleClickOutside(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      open = false;
    }
  }
</script>

<div class="export-wrapper" onfocusout={handleClickOutside}>
  <button class="export-btn" onclick={() => (open = !open)}>
    Export
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2.5 4 5 6.5 7.5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>
  {#if open}
    <div class="export-dropdown">
      <button class="export-option" onclick={() => handleExport('csv')}>CSV</button>
      <button class="export-option" onclick={() => handleExport('json')}>JSON</button>
    </div>
  {/if}
</div>

<style>
  .export-wrapper {
    position: relative;
    display: inline-flex;
    margin-left: auto;
  }

  .export-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: inherit;
    background: var(--color-bg);
    color: var(--color-fg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      background: var(--color-accent);
      border-color: var(--color-input-border);
    }

    &:active {
      transform: translateY(0.5px);
    }
  }

  .export-dropdown {
    position: absolute;
    top: calc(100% + 0.25rem);
    right: 0;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.1);
    z-index: 20;
    min-width: 5rem;
    overflow: hidden;
  }

  .export-option {
    display: block;
    width: 100%;
    padding: 0.4375rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: inherit;
    background: transparent;
    color: var(--color-fg);
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s ease;

    &:hover {
      background: var(--color-accent);
    }

    &:not(:last-child) {
      border-bottom: 1px solid var(--color-border);
    }
  }
</style>

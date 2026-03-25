<script>
  import { actionLabel } from "./utils.js";

  let { action, executing = false, result = null, onExecute } = $props();
</script>

<div class="ai-action-card">
  <div class="ai-action-info">
    <span class="ai-action-type">{action.type.replace(/_/g, " ")}</span>
    <span class="ai-action-label">{actionLabel(action)}</span>
  </div>
  {#if result}
    <span class="ai-action-result" class:success={result.success} class:error={!result.success}>
      {result.success ? result.message : result.error}
    </span>
  {:else}
    <button
      class="ai-action-approve"
      disabled={executing}
      onclick={() => onExecute?.(action)}
    >
      {executing ? "Running..." : "Approve"}
    </button>
  {/if}
</div>

<style>
  .ai-action-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-bg);
  }

  .ai-action-info {
    display: flex;
    flex-direction: column;
    gap: 0.0625rem;
    min-width: 0;
  }

  .ai-action-type {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted);
  }

  .ai-action-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-fg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ai-action-approve {
    flex-shrink: 0;
    padding: 0.25rem 0.625rem;
    font-size: 0.6875rem;
    font-weight: 600;
    font-family: inherit;
    background: var(--color-primary);
    color: var(--color-primary-fg);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: opacity 0.1s;

    &:hover { opacity: 0.9; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  .ai-action-result {
    flex-shrink: 0;
    font-size: 0.6875rem;
    font-weight: 500;
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &.success { color: var(--color-success); }
    &.error { color: var(--color-danger); }
  }
</style>

<script>
  let {
    content = "",
    isStreaming = false,
    isDone = false,
    duration = 0,
  } = $props();

  let expanded = $state(true);

  // Auto-collapse when done
  $effect(() => {
    if (isDone && content) {
      setTimeout(() => { expanded = false; }, 500);
    }
  });

  // Auto-expand when streaming starts
  $effect(() => {
    if (isStreaming && content) {
      expanded = true;
    }
  });
</script>

<div class="reasoning" class:streaming={isStreaming && !isDone}>
  <button class="reasoning-trigger" onclick={() => expanded = !expanded}>
    <div class="reasoning-indicator">
      {#if isStreaming && !isDone}
        <span class="reasoning-pulse"></span>
      {:else}
        <svg class="reasoning-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="8" cy="8" r="6"/>
          <path d="M8 5v3l2 1"/>
        </svg>
      {/if}
    </div>
    <span class="reasoning-label">
      {#if isStreaming && !isDone}
        Thinking...
      {:else if duration}
        Thought for {duration}s
      {:else}
        Reasoning
      {/if}
    </span>
    <svg class="reasoning-chevron" class:open={expanded} viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M3 4.5L6 7.5L9 4.5"/>
    </svg>
  </button>

  <div class="reasoning-collapse" class:open={expanded}>
    <div class="reasoning-collapse-inner">
      <div class="reasoning-content">
        {content}
        {#if isStreaming && !isDone}
          <span class="reasoning-cursor"></span>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .reasoning {
    margin-bottom: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
    font-size: 0.75rem;
  }

  .reasoning.streaming {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 3%, transparent);
  }

  .reasoning-trigger {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
    padding: 0.375rem 0.625rem;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    color: var(--color-muted);
    transition: color 0.1s;

    &:hover { color: var(--color-fg); }
  }

  .reasoning-indicator {
    width: 1rem;
    height: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .reasoning-pulse {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--color-primary);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.3); }
  }

  .reasoning-icon {
    width: 0.875rem;
    height: 0.875rem;
    color: var(--color-muted);
  }

  .reasoning-label {
    flex: 1;
    font-size: 0.6875rem;
    font-weight: 500;
  }

  .reasoning-chevron {
    width: 0.75rem;
    height: 0.75rem;
    flex-shrink: 0;
    transition: transform 0.2s;
    color: var(--color-muted);

    &.open { transform: rotate(180deg); }
  }

  .reasoning-collapse {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.25s ease;

    &.open { grid-template-rows: 1fr; }
  }

  .reasoning-collapse-inner {
    overflow: hidden;
  }

  .reasoning-content {
    padding: 0 0.625rem 0.5rem;
    font-size: 0.6875rem;
    line-height: 1.5;
    color: var(--color-muted);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 12rem;
    overflow-y: auto;
  }

  .reasoning-cursor {
    display: inline-block;
    width: 1.5px;
    height: 0.75rem;
    background: var(--color-primary);
    margin-left: 1px;
    animation: blink 0.8s infinite;
    vertical-align: text-bottom;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
</style>

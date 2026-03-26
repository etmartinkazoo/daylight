<script>
  import AiMessageBubble from "./AiMessageBubble.svelte";
  import ToolCard from "./ToolCard.svelte";
  import ReasoningBlock from "./ReasoningBlock.svelte";
  import { formatContent } from "./utils.js";

  let {
    messages = [],
    streaming = "",
    sending = false,
    toolStatus = "",
    toolLog = [],
    toolCalls = [],
    thinkingStream = "",
    thinkingDone = false,
    thinkingDuration = 0,
    executingActions = {},
    executedActions = {},
    onRecordLinkClick,
    onExecuteAction,
    onRetry,
    onSuggestion,
    onStop,
    onMessagesElReady,
  } = $props();

  let messagesDiv = $state(null);
  let showThinking = $state(false);
  let isAtBottom = $state(true);

  $effect(() => {
    if (messagesDiv) onMessagesElReady?.(messagesDiv);
  });

  function handleScroll() {
    if (!messagesDiv) return;
    const threshold = 80;
    isAtBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight < threshold;
  }

  function scrollToBottom() {
    messagesDiv?.scrollTo({ top: messagesDiv.scrollHeight, behavior: "smooth" });
  }

  // Auto-scroll when new content arrives and user is at bottom
  $effect(() => {
    // Track dependencies
    messages.length; streaming; sending;
    if (isAtBottom) {
      setTimeout(() => messagesDiv?.scrollTo({ top: messagesDiv.scrollHeight, behavior: "smooth" }), 50);
    }
  });

  function handleClick(e) {
    const link = e.target.closest(".ai-record-link");
    if (link) {
      e.preventDefault();
      onRecordLinkClick?.(link.dataset.type, parseInt(link.dataset.id));
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="ai-messages" bind:this={messagesDiv} onclick={handleClick} onscroll={handleScroll}>
  {#if messages.length === 0 && !streaming}
    <div class="ai-empty">
      <p class="ai-empty-title">How can I help?</p>
      <p class="ai-empty-hint">Type <kbd>@</kbd> to reference partners, projects, todos, docs, or files.</p>
      <div class="ai-shortcuts">
        <kbd>@</kbd> to mention &nbsp;&middot;&nbsp; <kbd>&#8984;</kbd><kbd>&#8679;</kbd><kbd>A</kbd> to toggle
      </div>
    </div>
  {/if}

  {#each messages as msg, msgIdx}
    {#if msg.role === "assistant" && msg.toolCalls?.length > 0}
      <div class="tool-cards">
        {#each msg.toolCalls as tc (tc.id)}
          <ToolCard tool={tc.tool} message={tc.message} arguments={tc.arguments} status={tc.status} result={tc.result} />
        {/each}
      </div>
    {/if}
    <AiMessageBubble
      {msg}
      {msgIdx}
      {executingActions}
      {executedActions}
      {onExecuteAction}
      onRetry={msg.role === "assistant" && msgIdx === messages.length - 1 ? onRetry : undefined}
      {onSuggestion}
      isLast={msgIdx === messages.length - 1}
    />
  {/each}

  <!-- Active tool calls during generation -->
  {#if toolCalls.length > 0 && sending}
    <div class="tool-cards">
      {#each toolCalls as tc (tc.id)}
        <ToolCard tool={tc.tool} message={tc.message} arguments={tc.arguments} status={tc.status} result={tc.result} />
      {/each}
    </div>
  {/if}

  <!-- Live reasoning while AI is thinking -->
  {#if thinkingStream && sending}
    <div class="msg msg-assistant">
      <div class="msg-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      </div>
      <div class="msg-body">
        <span class="msg-role">Assistant</span>
        <ReasoningBlock
          content={thinkingStream}
          isStreaming={!thinkingDone}
          isDone={thinkingDone}
          duration={thinkingDuration}
        />
        {#if streaming}
          <div class="msg-content">{@html formatContent(streaming)}<span class="cursor-blink"></span></div>
        {/if}
      </div>
    </div>
  {:else if streaming}
    <div class="msg msg-assistant">
      <div class="msg-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      </div>
      <div class="msg-body">
        <span class="msg-role">Assistant</span>
        <div class="msg-content">{@html formatContent(streaming)}<span class="cursor-blink"></span></div>
      </div>
    </div>
  {/if}

  {#if sending && !streaming && !thinkingStream}
    <div class="msg msg-assistant">
      <div class="msg-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      </div>
      <div class="msg-body">
        <span class="msg-role">Assistant</span>
        <div class="thinking-row">
          {#if toolStatus}
            <div class="tool-status">
              <span class="tool-spinner"></span>
              <span>{toolStatus}</span>
            </div>
          {:else}
            <div class="thinking-dots">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          {/if}
          {#if toolLog.length > 0}
            <button class="see-thinking-btn" onclick={() => showThinking = !showThinking}>
              {showThinking ? "Hide" : "See Thinking"}
            </button>
          {/if}
        </div>
        {#if showThinking && toolLog.length > 0}
          <div class="thinking-log">
            <div class="thinking-log-title">Activity</div>
            {#each toolLog as entry}
              <div class="thinking-log-entry">
                <span class="thinking-log-tool">{entry.tool}</span>
                <span class="thinking-log-msg">{entry.message}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

{#if sending}
  <div class="ai-stop-bar">
    <button class="ai-stop-btn" onclick={onStop}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="2" width="8" height="8" rx="1.5"/></svg>
      Stop generating
    </button>
  </div>
{/if}

{#if !isAtBottom && messages.length > 0}
  <button class="scroll-bottom-btn" onclick={scrollToBottom}>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 3v10M4 9l4 4 4-4"/></svg>
  </button>
{/if}

<style>
  .ai-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .ai-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 0.375rem;
    color: var(--color-muted);
  }

  .ai-empty-title { font-size: 1rem; font-weight: 600; color: var(--color-fg); }
  .ai-empty-hint { font-size: 0.8125rem; }
  .ai-empty-hint :global(kbd) {
    padding: 0.0625rem 0.25rem; border-radius: 0.1875rem;
    background: var(--color-accent); border: 1px solid var(--color-border);
    font-family: inherit; font-size: 0.75rem; font-weight: 600;
  }
  .ai-shortcuts {
    margin-top: 0.5rem; display: flex; align-items: center; gap: 0.125rem; font-size: 0.6875rem;
    kbd { padding: 0.0625rem 0.3125rem; border-radius: 0.375rem; background: var(--color-accent); border: 1px solid var(--color-border); font-family: inherit; font-size: 0.625rem; }
  }

  /* Tool cards */
  .tool-cards {
    display: flex; flex-direction: column; gap: 0.25rem;
    padding: 0.25rem 0 0.25rem 2.5rem;
    animation: msg-in 0.2s ease;
  }

  /* Streaming & loading — matches msg layout from AiMessageBubble */
  .msg {
    display: flex; gap: 0.75rem; padding: 0.75rem 0;
    animation: msg-in 0.25s ease;
  }
  @keyframes msg-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .msg-avatar {
    width: 1.75rem; height: 1.75rem; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; margin-top: 0.125rem;
    background: var(--color-accent); color: var(--color-fg);
    svg { width: 1rem; height: 1rem; }
  }
  .msg-body { flex: 1; min-width: 0; }
  .msg-role { display: block; font-size: 0.75rem; font-weight: 600; color: var(--color-fg); margin-bottom: 0.25rem; }
  .msg-content {
    font-size: 0.8125rem; line-height: 1.65; color: var(--color-fg);
    overflow-wrap: break-word; word-break: break-word;
  }

  .cursor-blink {
    display: inline-block; width: 2px; height: 0.875rem;
    background: var(--color-primary); margin-left: 2px;
    animation: blink 0.8s infinite; vertical-align: text-bottom;
  }
  @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }

  /* Thinking / loading */
  .thinking-row { display: flex; align-items: center; gap: 0.5rem; }
  .thinking-dots { display: flex; gap: 0.25rem; padding: 0.25rem 0; }
  .dot {
    width: 5px; height: 5px; border-radius: 50%; background: var(--color-muted);
    animation: bounce 1.2s infinite;
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
  @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-3px); } }

  .tool-status {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.8125rem; color: var(--color-muted); font-style: italic;
  }
  .tool-spinner {
    width: 14px; height: 14px;
    border: 2px solid var(--color-border); border-top-color: var(--color-primary);
    border-radius: 50%; animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .see-thinking-btn {
    font-size: 0.6875rem; font-weight: 500; font-family: inherit;
    color: var(--color-primary); background: none;
    border: 1px solid var(--color-primary); border-radius: 9999px;
    padding: 0.125rem 0.5rem; cursor: pointer; white-space: nowrap;
    &:hover { background: var(--color-primary-subtle); }
  }

  .thinking-log {
    margin-top: 0.5rem; padding: 0.5rem 0.75rem;
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 0.375rem; font-size: 0.75rem;
    max-height: 12rem; overflow-y: auto;
  }
  .thinking-log-title {
    font-size: 0.625rem; font-weight: 600; text-transform: uppercase;
    letter-spacing: 0.04em; color: var(--color-muted); margin-bottom: 0.25rem;
  }
  .thinking-log-entry {
    display: flex; align-items: baseline; gap: 0.5rem;
    padding: 0.1875rem 0; border-bottom: 1px solid var(--color-border);
    &:last-child { border-bottom: none; }
  }
  .thinking-log-tool { font-family: monospace; font-size: 0.6875rem; font-weight: 600; color: var(--color-primary); flex-shrink: 0; }
  .thinking-log-msg { color: var(--color-fg); font-size: 0.75rem; }

  /* Scroll to bottom */
  .scroll-bottom-btn {
    position: sticky; bottom: 0.5rem;
    align-self: center;
    display: flex; align-items: center; justify-content: center;
    width: 2rem; height: 2rem;
    border: 1px solid var(--color-border);
    border-radius: 50%;
    background: var(--color-bg);
    color: var(--color-muted);
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
    transition: all 0.15s;
    z-index: 5;

    &:hover { background: var(--color-accent); color: var(--color-fg); }
  }

  /* Stop bar */
  .ai-stop-bar {
    display: flex; justify-content: center;
    padding: 0.5rem 1rem; border-top: 1px solid var(--color-border); flex-shrink: 0;
  }
  .ai-stop-btn {
    display: flex; align-items: center; gap: 0.375rem;
    padding: 0.375rem 0.75rem; font-size: 0.75rem; font-weight: 500;
    font-family: inherit; border: 1px solid var(--color-border);
    border-radius: 9999px; background: var(--color-bg);
    color: var(--color-fg); cursor: pointer; transition: all 0.1s;
    &:hover { background: var(--color-danger-subtle); border-color: var(--color-danger); color: var(--color-danger); }
  }
</style>

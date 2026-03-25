<script>
  import AiActionCard from "./AiActionCard.svelte";
  import ReasoningBlock from "./ReasoningBlock.svelte";
  import SourcesBlock from "./SourcesBlock.svelte";
  import SuggestionsBar from "./SuggestionsBar.svelte";
  import ArtifactBlock from "./ArtifactBlock.svelte";
  import { formatContent, parseActions, extractArtifacts, extractSources, contextualSuggestions } from "./utils.js";

  let {
    msg,
    msgIdx,
    executingActions = {},
    executedActions = {},
    onExecuteAction,
    onRetry,
    onSuggestion,
    isLast = false,
  } = $props();

  // Extract artifacts first, then actions from remaining content
  let artifactResult = $derived(
    msg.role === "assistant" ? extractArtifacts(msg.content) : { text: msg.content, artifacts: [] },
  );

  let parsed = $derived(
    msg.role === "assistant" ? parseActions(artifactResult.text) : { text: msg.content, actions: [] },
  );

  let sources = $derived(
    msg.role === "assistant" ? extractSources(msg.content, msg.toolCalls) : [],
  );

  let suggestions = $derived(
    msg.role === "assistant" && isLast ? contextualSuggestions(msg.content, msg.toolCalls) : [],
  );

  let copied = $state(false);
  let rated = $state(null); // "up" | "down" | null
  let actionsVisible = $state(false);

  function copyContent() {
    const text = parsed.text || msg.content || "";
    // Strip HTML for plain text copy
    const div = document.createElement("div");
    div.innerHTML = formatContent(text);
    navigator.clipboard.writeText(div.textContent || text).then(() => {
      copied = true;
      setTimeout(() => copied = false, 2000);
    });
  }

  function rate(type) {
    rated = rated === type ? null : type;
  }

  function retry() {
    onRetry?.(msgIdx);
  }

  function switchBranch(idx) {
    if (!msg.branches || idx < 0 || idx >= msg.branches.length) return;
    const branch = msg.branches[idx];
    msg.activeBranch = idx;
    msg.content = branch.content;
    msg.toolCalls = branch.toolCalls;
    msg.thinking = branch.thinking;
  }
</script>

<div
  class="msg msg-{msg.role}"
  onmouseenter={() => actionsVisible = true}
  onmouseleave={() => actionsVisible = false}
>
  <!-- Avatar -->
  <div class="msg-avatar">
    {#if msg.role === "user"}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"/></svg>
    {:else}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
    {/if}
  </div>

  <div class="msg-body">
    <!-- Role label -->
    <span class="msg-role">{msg.role === "user" ? "You" : "Assistant"}</span>

    <!-- Thinking -->
    {#if msg.thinking}
      <ReasoningBlock
        content={msg.thinking}
        isDone={true}
        duration={msg.thinkingDuration}
      />
    {/if}

    <!-- Content -->
    <div class="msg-content">{@html formatContent(parsed.text)}</div>

    <!-- Artifacts -->
    {#if artifactResult.artifacts.length > 0}
      {#each artifactResult.artifacts as artifact}
        <ArtifactBlock title={artifact.title} type={artifact.type}>
          {#snippet children()}
            {#if artifact.format === "code"}
              <div class="code-block">
                <div class="code-header">
                  <span class="code-lang">{artifact.lang || ""}</span>
                  <button class="code-copy" onclick={() => { navigator.clipboard.writeText(artifact.content); }}>Copy</button>
                </div>
                <pre class="md-pre"><code>{artifact.content}</code></pre>
              </div>
            {:else}
              {@html formatContent(artifact.content)}
            {/if}
          {/snippet}
          {#snippet actions()}
            <button class="artifact-copy-btn" onclick={() => navigator.clipboard.writeText(artifact.content)} title="Copy">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3a1.5 1.5 0 011.5-1.5H11"/></svg>
            </button>
          {/snippet}
        </ArtifactBlock>
      {/each}
    {/if}

    <!-- Branch navigation -->
    {#if msg.branches?.length > 1}
      <div class="msg-branches">
        <button class="branch-nav" disabled={msg.activeBranch === 0} onclick={() => switchBranch(msg.activeBranch - 1)}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7.5 2.5L4 6l3.5 3.5"/></svg>
        </button>
        <span class="branch-label">{(msg.activeBranch ?? 0) + 1} / {msg.branches.length}</span>
        <button class="branch-nav" disabled={msg.activeBranch === msg.branches.length - 1} onclick={() => switchBranch(msg.activeBranch + 1)}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.5 2.5L8 6l-3.5 3.5"/></svg>
        </button>
      </div>
    {/if}

    <!-- Actions toolbar (assistant only) -->
    {#if msg.role === "assistant"}
      <div class="msg-toolbar" class:visible={actionsVisible || copied || rated}>
        <button class="toolbar-btn" onclick={copyContent} title={copied ? "Copied!" : "Copy"}>
          {#if copied}
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3.5 8.5l3 3 6-6"/></svg>
          {:else}
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3a1.5 1.5 0 011.5-1.5H11"/></svg>
          {/if}
        </button>
        <button class="toolbar-btn" class:active={rated === "up"} onclick={() => rate("up")} title="Good response">
          <svg viewBox="0 0 16 16" fill={rated === "up" ? "currentColor" : "none"} stroke="currentColor" stroke-width="1.5"><path d="M5 14V7l3-5 1.5 1-1 4H13a1 1 0 011 1.1l-1 5A1 1 0 0112 14H5zM3 7H2a1 1 0 00-1 1v5a1 1 0 001 1h1"/></svg>
        </button>
        <button class="toolbar-btn" class:active={rated === "down"} onclick={() => rate("down")} title="Bad response">
          <svg viewBox="0 0 16 16" fill={rated === "down" ? "currentColor" : "none"} stroke="currentColor" stroke-width="1.5"><path d="M11 2v7l-3 5-1.5-1 1-4H3a1 1 0 01-1-1.1l1-5A1 1 0 014 2h7zM13 9h1a1 1 0 001-1V3a1 1 0 00-1-1h-1"/></svg>
        </button>
        {#if onRetry}
          <button class="toolbar-btn" onclick={retry} title="Retry">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8a6 6 0 0110.47-4M14 8a6 6 0 01-10.47 4"/><path d="M12 1v3h-3M4 15v-3h3"/></svg>
          </button>
        {/if}
      </div>
    {/if}

    <!-- Sources -->
    <SourcesBlock {sources} />

    <!-- Action cards -->
    {#if parsed.actions.length > 0}
      <div class="msg-actions">
        {#each parsed.actions as action, actionIdx}
          {@const key = `${msgIdx}-${actionIdx}-${JSON.stringify(action)}`}
          <AiActionCard
            {action}
            executing={executingActions[key]}
            result={executedActions[key]}
            onExecute={() => onExecuteAction?.(action, `${msgIdx}-${actionIdx}`)}
          />
        {/each}
      </div>
    {/if}

    <!-- Contextual suggestions (last message only) -->
    <SuggestionsBar {suggestions} onSelect={onSuggestion} />
  </div>
</div>

<style>
  .msg {
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem 0;
    animation: msg-in 0.25s ease;
  }

  @keyframes msg-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .msg-avatar {
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 0.125rem;

    svg { width: 1rem; height: 1rem; }
  }

  .msg-user .msg-avatar {
    background: var(--color-primary-subtle);
    color: var(--color-primary);
  }

  .msg-assistant .msg-avatar {
    background: var(--color-accent);
    color: var(--color-fg);
  }

  .msg-body {
    flex: 1;
    min-width: 0;
  }

  .msg-role {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-fg);
    margin-bottom: 0.25rem;
    letter-spacing: -0.01em;
  }

  /* Content */
  .msg-content {
    font-size: 0.8125rem;
    line-height: 1.65;
    color: var(--color-fg);
    overflow-wrap: break-word;
    word-break: break-word;
  }

  .msg-content :global(p) { margin: 0.375rem 0; }
  .msg-content :global(p:first-child) { margin-top: 0; }
  .msg-content :global(p:last-child) { margin-bottom: 0; }

  .msg-content :global(strong) { font-weight: 600; }

  .msg-content :global(code) {
    font-size: 0.75rem;
    font-family: "SF Mono", "Cascadia Code", "Fira Code", monospace;
    background: var(--color-accent);
    padding: 0.125rem 0.3125rem;
    border-radius: calc(var(--radius-sm) * 0.5);
    border: 1px solid var(--color-border);
  }

  .msg-content :global(.code-block) {
    margin: 0.5rem 0;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .msg-content :global(.code-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.25rem 0.75rem;
    background: var(--color-accent);
    border-bottom: 1px solid var(--color-border);
  }

  .msg-content :global(.code-lang) {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted);
  }

  .msg-content :global(.code-copy) {
    font-size: 0.625rem;
    font-weight: 500;
    font-family: inherit;
    color: var(--color-muted);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.125rem 0.375rem;
    border-radius: calc(var(--radius-sm) * 0.5);
    &:hover { background: var(--color-bg); color: var(--color-fg); }
  }

  .msg-content :global(pre) {
    overflow-x: auto;
    padding: 0.75rem 1rem;
    background: var(--color-surface);
    font-size: 0.75rem;
    line-height: 1.5;
    margin: 0;

    :global(code) {
      background: none;
      border: none;
      padding: 0;
    }
  }

  /* Standalone pre without code-block wrapper */
  .msg-content > :global(pre) {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    margin: 0.5rem 0;
  }

  .msg-content :global(ul),
  .msg-content :global(ol) {
    padding-left: 1.25rem;
    margin: 0.375rem 0;
  }

  .msg-content :global(li) {
    margin: 0.25rem 0;
    line-height: 1.5;
  }

  .msg-content :global(a) {
    color: var(--color-primary);
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  .msg-content :global(blockquote) {
    border-left: 3px solid var(--color-primary);
    padding-left: 0.75rem;
    margin: 0.5rem 0;
    color: var(--color-muted);
    font-style: italic;
  }

  .msg-content :global(.ai-record-link) {
    display: inline;
    font-family: inherit;
    font-size: inherit;
    font-weight: 600;
    color: var(--color-primary);
    background: none;
    border: none;
    border-bottom: 1px dashed var(--color-primary);
    cursor: pointer;
    padding: 0;
    &:hover { opacity: 0.8; }
  }


  /* Artifact copy button */
  .artifact-copy-btn {
    display: flex; align-items: center; justify-content: center;
    width: 1.5rem; height: 1.5rem; border: none; background: none;
    border-radius: var(--radius-sm); cursor: pointer; color: var(--color-muted);
    &:hover { background: var(--color-bg); color: var(--color-fg); }
  }

  /* Branch navigation */
  .msg-branches {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.375rem;
  }

  .branch-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    border: none;
    background: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--color-muted);

    svg { width: 0.75rem; height: 0.75rem; }
    &:hover:not(:disabled) { background: var(--color-accent); color: var(--color-fg); }
    &:disabled { opacity: 0.25; cursor: not-allowed; }
  }

  .branch-label {
    font-size: 0.6875rem;
    font-weight: 500;
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
    min-width: 2rem;
    text-align: center;
  }

  /* Toolbar */
  .msg-toolbar {
    display: flex;
    gap: 0.125rem;
    margin-top: 0.375rem;
    opacity: 0;
    transition: opacity 0.15s ease;

    &.visible { opacity: 1; }
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.625rem;
    height: 1.625rem;
    border: none;
    background: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--color-muted);
    transition: all 0.1s ease;

    svg { width: 0.875rem; height: 0.875rem; }

    &:hover {
      background: var(--color-accent);
      color: var(--color-fg);
    }

    &.active {
      color: var(--color-primary);
    }
  }

  /* Action cards */
  .msg-actions {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin-top: 0.5rem;
  }
</style>

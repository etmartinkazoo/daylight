<script>
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
  import { typeIcon, typeColor } from "./utils.js";

  let {
    input = $bindable(""),
    references = $bindable([]),
    sending = false,
    chatId = null,
    chatScope = $bindable("standard"),
    onSend,
    onStop,
  } = $props();

  let inputEl = $state(null);
  let mentionOpen = $state(false);
  let mentionQuery = $state("");
  let mentionResults = $state([]);
  let mentionLoading = $state(false);
  let mentionIndex = $state(0);
  let mentionStartPos = $state(-1);
  let mentionSearchTimer = null;

  function handleKeydown(e) {
    if (mentionOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        mentionIndex = Math.min(mentionIndex + 1, mentionResults.length - 1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        mentionIndex = Math.max(mentionIndex - 1, 0);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (mentionResults[mentionIndex]) selectMention(mentionResults[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeMention();
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend?.();
    }
  }

  function handleInput(e) {
    const el = e.target;
    const val = el.value;
    const pos = el.selectionStart;

    if (mentionOpen) {
      const textSinceTrigger = val.substring(mentionStartPos + 1, pos);
      if (textSinceTrigger.includes(" ") || pos <= mentionStartPos) {
        closeMention();
      } else {
        mentionQuery = textSinceTrigger;
        debouncedSearch(mentionQuery);
      }
    } else if (pos > 0 && val[pos - 1] === "@") {
      if (pos === 1 || val[pos - 2] === " " || val[pos - 2] === "\n") {
        mentionStartPos = pos - 1;
        mentionOpen = true;
        mentionQuery = "";
        mentionIndex = 0;
        searchMentions("");
      }
    }
  }

  function debouncedSearch(q) {
    clearTimeout(mentionSearchTimer);
    mentionSearchTimer = setTimeout(() => searchMentions(q), 200);
  }

  // Direct fetch for mention search — WebSocket/streaming context, not Inertia-compatible
  async function searchMentions(q) {
    mentionLoading = true;
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.content;
      const res = await fetch(`/ai_chats/mentions?q=${encodeURIComponent(q)}`, {
        headers: { Accept: "application/json", "X-CSRF-Token": token },
      });
      if (res.ok) {
        const data = await res.json();
        mentionResults = data.results || [];
        mentionIndex = 0;
      }
    } catch {}
    mentionLoading = false;
  }

  function selectMention(item) {
    const before = input.substring(0, mentionStartPos);
    const after = input.substring(inputEl.selectionStart);
    input = before + after;

    const exists = references.some(
      (r) => r.type === item.type && r.id === item.id && r.path === item.path,
    );
    if (!exists) {
      references = [...references, item];
    }
    closeMention();
    setTimeout(() => inputEl?.focus(), 10);
  }

  function removeReference(index) {
    references = references.filter((_, i) => i !== index);
    inputEl?.focus();
  }

  export function closeMention() {
    mentionOpen = false;
    mentionQuery = "";
    mentionResults = [];
    mentionIndex = 0;
    mentionStartPos = -1;
    clearTimeout(mentionSearchTimer);
  }

  export function isMentionOpen() {
    return mentionOpen;
  }

  export function focus() {
    inputEl?.focus();
  }

  export function cleanup() {
    clearTimeout(mentionSearchTimer);
  }
</script>

<!-- Reference pills -->
{#if references.length > 0}
  <div class="ai-refs">
    {#each references as ref, i}
      <span class="ai-ref-pill" style="--ref-color: {typeColor(ref.type)}">
        <span class="ai-ref-icon">{typeIcon(ref.type)}</span>
        <span class="ai-ref-label">{ref.label}</span>
        <button class="ai-ref-remove" onclick={() => removeReference(i)}>&times;</button>
      </span>
    {/each}
  </div>
{/if}

<!-- Scope selector — only before first message -->
{#if !chatId}
  <div class="ai-scope-bar">
    <span class="ai-scope-label">Scope:</span>
    <button class="ai-scope-btn" class:active={chatScope === "focused"} onclick={() => chatScope = "focused"} title="Just this record — fast, focused">Focused</button>
    <button class="ai-scope-btn" class:active={chatScope === "standard"} onclick={() => chatScope = "standard"} title="This area + related context">Standard</button>
    <button class="ai-scope-btn" class:active={chatScope === "wide"} onclick={() => chatScope = "wide"} title="Load everything — for reorg, triage, analysis">Wide</button>
  </div>
{/if}

<div class="ai-input-wrap">
  {#if mentionOpen}
    <div class="mention-popup">
      {#if mentionLoading && mentionResults.length === 0}
        <div class="mention-loading">Searching...</div>
      {:else if mentionResults.length === 0}
        <div class="mention-empty">{mentionQuery ? "No results" : "Type to search..."}</div>
      {:else}
        {#each mentionResults as item, i}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="mention-item"
            class:active={i === mentionIndex}
            onmousedown={(e) => { e.preventDefault(); selectMention(item); }}
            onmouseenter={() => mentionIndex = i}
          >
            <span class="mention-type-badge" style="--ref-color: {typeColor(item.type)}">{typeIcon(item.type)}</span>
            <div class="mention-item-info">
              <span class="mention-item-name">{item.label}</span>
              {#if item.hint}
                <span class="mention-item-hint">{item.hint}</span>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}

  <div class="ai-input-area">
    <textarea
      bind:this={inputEl}
      bind:value={input}
      onkeydown={handleKeydown}
      oninput={handleInput}
      placeholder={references.length > 0 ? "Ask about the referenced items..." : "Ask anything... (@ to mention)"}
      rows="1"
      class="ai-input"
      disabled={sending}
    ></textarea>
    <button class="ai-send" onclick={onSend} disabled={sending || !input.trim()}>
      <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
    </button>
  </div>
</div>

<style>
  .ai-refs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    padding: 0.5rem 1rem 0;
    flex-shrink: 0;
  }

  .ai-ref-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.1875rem 0.5rem;
    font-size: 0.6875rem;
    font-weight: 500;
    border: 1px solid var(--color-border, rgba(226, 232, 240, 0.6));
    border-radius: 9999px;
    background: var(--color-surface, #f8fafc);
    color: var(--color-fg, #0f172a);
    animation: pill-in 0.15s ease;
  }

  @keyframes pill-in {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }

  .ai-ref-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.125rem;
    height: 1.125rem;
    border-radius: 0.1875rem;
    background: var(--ref-color, #64748b);
    color: white;
    font-size: 0.5625rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .ai-ref-label {
    max-width: 10rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ai-ref-remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1rem;
    height: 1rem;
    border: none;
    background: none;
    border-radius: 50%;
    cursor: pointer;
    color: var(--color-muted, #64748b);
    font-size: 0.875rem;
    line-height: 1;
    padding: 0;
    flex-shrink: 0;

    &:hover { background: var(--color-danger-subtle, #fef2f2); color: var(--color-danger, #dc2626); }
  }

  .ai-scope-bar {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    border-top: 1px solid var(--color-border, rgba(226, 232, 240, 0.6));
    flex-shrink: 0;
  }

  .ai-scope-label {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--color-muted, #64748b);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .ai-scope-btn {
    padding: 0.25rem 0.5rem;
    font-size: 0.6875rem;
    font-weight: 500;
    font-family: inherit;
    border: 1px solid var(--color-border, rgba(226, 232, 240, 0.6));
    border-radius: var(--radius-sm, 0.375rem);
    background: var(--color-bg, #fff);
    color: var(--color-muted, #64748b);
    cursor: pointer;

    &:hover { color: var(--color-fg, #0f172a); border-color: var(--color-input-border, rgba(203, 213, 225, 0.7)); }
    &.active { background: var(--color-primary-subtle, #eef2ff); color: var(--color-primary, #4f46e5); border-color: var(--color-primary, #4f46e5); }
  }

  .ai-input-wrap {
    position: relative;
    flex-shrink: 0;
  }

  .mention-popup {
    position: absolute;
    bottom: 100%;
    left: 1rem;
    right: 1rem;
    max-height: 16rem;
    overflow-y: auto;
    background: var(--color-bg, #fff);
    border: 1px solid var(--color-border, rgba(226, 232, 240, 0.6));
    border-radius: var(--radius, 0.5rem);
    box-shadow: var(--shadow-lg, 0 4px 8px rgba(0, 0, 0, 0.03), 0 8px 24px -4px rgba(0, 0, 0, 0.08));
    z-index: 10;
    padding: 0.25rem;
  }

  .mention-loading, .mention-empty {
    padding: 0.75rem;
    font-size: 0.75rem;
    color: var(--color-muted, #64748b);
    text-align: center;
  }

  .mention-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border-radius: var(--radius-sm, 0.375rem);
    cursor: pointer;
    transition: background 0.05s;

    &:hover, &.active { background: var(--color-accent, #f1f5f9); }
  }

  .mention-type-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.375rem;
    height: 1.375rem;
    border-radius: 0.1875rem;
    background: var(--ref-color, #64748b);
    color: white;
    font-size: 0.5625rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .mention-item-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .mention-item-name {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-fg, #0f172a);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mention-item-hint {
    font-size: 0.6875rem;
    color: var(--color-muted, #64748b);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ai-input-area {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--color-border, rgba(226, 232, 240, 0.6));
  }

  .ai-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    font-family: inherit;
    border: 1px solid var(--color-input-border, rgba(203, 213, 225, 0.7));
    border-radius: var(--radius-sm, 0.375rem);
    background: var(--color-bg, #fff);
    color: var(--color-fg, #0f172a);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    outline: none;
    resize: none;
    min-height: 2.25rem;
    max-height: 8rem;
    line-height: 1.4;
    transition: border-color 0.15s, box-shadow 0.15s;

    &:focus { border-color: var(--color-focus, #6366f1); box-shadow: 0 0 0 2px var(--color-focus-ring, rgba(99, 102, 241, 0.2)); }
    &::placeholder { color: var(--color-muted, #64748b); }
    &:disabled { opacity: 0.6; }
  }

  .ai-send {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: none;
    background: var(--color-primary, #4f46e5);
    color: var(--color-primary-fg, #fff);
    border-radius: var(--radius-sm, 0.375rem);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, opacity 0.1s;

    &:hover { background: var(--color-primary-hover, #4338ca); }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }
</style>

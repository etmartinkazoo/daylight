<script>
  import { usePage } from "@inertiajs/svelte";
  import EwAiChat from "./EwAiChat.svelte";

  let { open = $bindable(false), title = "", aiContext = "", children } = $props();

  const pageStore = usePage();
  let ewSettings = $derived($pageStore.props.ew_settings || {});

  let appContextStr = $derived.by(() => {
    const parts = [];
    if (ewSettings.ai_context_notes) parts.push(ewSettings.ai_context_notes);
    if (ewSettings.github_repo_url) parts.push(`GitHub repo: ${ewSettings.github_repo_url} (branch: ${ewSettings.github_default_branch || "main"})`);
    return parts.join("\n");
  });

  let activeTab = $state("info");
  let aiChatRef;

  function close() { open = false; }

  function switchToAi() {
    activeTab = "ai";
    aiChatRef?.focus();
  }

  $effect(() => {
    if (open) activeTab = "info";
  });

  // Escape to close + Cmd/Ctrl+Shift+A to toggle
  $effect(() => {
    function onKey(e) {
      if (e.key === "Escape" && open) { close(); return; }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (open) {
          if (activeTab === "ai") close();
          else switchToAi();
        } else {
          open = true;
          // Switch to AI tab on next tick after open sets activeTab to "info"
          setTimeout(() => switchToAi(), 0);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
</script>

{#if open}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="ew-sheet-backdrop" onclick={close}></div>
  <div class="ew-sheet" role="dialog" aria-modal="true" aria-label={title}>
    <div class="ew-sheet-header">
      <h3 class="ew-sheet-title">{title}</h3>
      <button class="ew-sheet-close" onclick={close} aria-label="Close">&times;</button>
    </div>

    <div class="ew-sheet-tabs">
      <button class="ew-sheet-tab" class:active={activeTab === "info"} onclick={() => activeTab = "info"}>
        Info
      </button>
      <button class="ew-sheet-tab" class:active={activeTab === "ai"} onclick={switchToAi}>
        AI
      </button>
    </div>

    <div class="ew-sheet-body" class:ew-sheet-body-ai={activeTab === "ai"}>
      {#if activeTab === "info"}
        {@render children()}
      {:else}
        <EwAiChat bind:this={aiChatRef} context={aiContext} appContext={appContextStr} />
      {/if}
    </div>
  </div>
{/if}

<style>
  .ew-sheet-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(2px);
    z-index: 100;
    animation: ew-fade 0.2s ease;
  }

  @keyframes ew-fade { from { opacity: 0; } to { opacity: 1; } }

  .ew-sheet {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 540px;
    max-width: 90vw;
    background: var(--color-bg, #fff);
    box-shadow: var(--shadow-xl, 0 8px 16px rgba(0, 0, 0, 0.04), 0 16px 40px -8px rgba(0, 0, 0, 0.1));
    border-left: 1px solid var(--color-border, #e2e8f0);
    z-index: 101;
    display: flex;
    flex-direction: column;
    animation: ew-slide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes ew-slide { from { transform: translateX(100%); } to { transform: translateX(0); } }

  .ew-sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border, rgba(226, 232, 240, 0.6));
    flex-shrink: 0;
  }

  .ew-sheet-title {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--color-fg, #0f172a);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ew-sheet-close {
    width: 1.75rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    border: none;
    background: none;
    color: var(--color-muted, #64748b);
    cursor: pointer;
    flex-shrink: 0;
    border-radius: var(--radius-sm, 0.375rem);
    transition: all 0.1s;
    &:hover { background: var(--color-accent, #f1f5f9); color: var(--color-fg, #0f172a); }
  }

  .ew-sheet-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border, rgba(226, 232, 240, 0.6));
    flex-shrink: 0;
  }

  .ew-sheet-tab {
    flex: 1;
    padding: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    font-family: inherit;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border: none;
    background: none;
    color: var(--color-muted, #64748b);
    cursor: pointer;
    text-align: center;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: all 0.15s ease;

    &:hover { color: var(--color-fg, #0f172a); }
    &.active { color: var(--color-primary, #4f46e5); border-bottom-color: var(--color-primary, #4f46e5); }
  }

  .ew-sheet-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
  }

  .ew-sheet-body-ai {
    padding: 0;
    overflow: hidden;
  }
</style>

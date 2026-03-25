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

  $effect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === "Escape") close(); }
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

    <div class="ew-sheet-body">
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
    background: rgba(0,0,0,0.4);
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
    background: #fff;
    border-left: 1px solid #e2e8f0;
    box-shadow: -8px 0 30px rgba(0, 0, 0, 0.08);
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
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }

  .ew-sheet-title {
    font-size: 0.9375rem;
    font-weight: 700;
    color: #0f172a;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ew-sheet-close {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    border: none;
    background: none;
    color: #94a3b8;
    cursor: pointer;
    flex-shrink: 0;
    border-radius: 0.375rem;
    transition: all 0.15s ease;
    &:hover { background: #f1f5f9; color: #0f172a; }
  }

  .ew-sheet-tabs {
    display: flex;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
    padding: 0 1.5rem;
    gap: 0.5rem;
  }

  .ew-sheet-tab {
    padding: 0.625rem 0.75rem;
    font-size: 0.8125rem;
    font-weight: 500;
    font-family: inherit;
    border: none;
    background: none;
    color: #64748b;
    cursor: pointer;
    text-align: center;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: all 0.15s ease;

    &:hover { color: #0f172a; }
    &.active { color: #0f172a; border-bottom-color: #0f172a; font-weight: 600; }
  }

  .ew-sheet-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
  }
</style>

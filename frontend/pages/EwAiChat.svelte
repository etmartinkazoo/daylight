<script>
  import { usePage } from "@inertiajs/svelte";
  import { consumer } from "@/utils/cable";
  import { onDestroy } from "svelte";
  import AiChatMessages from "@/components/common/ai-chat/AiChatMessages.svelte";
  import AiChatInput from "@/components/common/ai-chat/AiChatInput.svelte";

  let { context = "", appContext = "" } = $props();

  const pageStore = usePage();
  let aiModels = $derived($pageStore.props.aiModels || []);
  let defaultAiModel = $derived($pageStore.props.defaultAiModel || "");
  let selectedModel = $state("");

  $effect(() => {
    if (selectedModel) return;
    if (defaultAiModel) selectedModel = defaultAiModel;
    else if (aiModels.length > 0) selectedModel = aiModels[0].value;
  });

  // Chat state
  let chatId = $state(null);
  let messages = $state([]);
  let input = $state("");
  let references = $state([]);
  let sending = $state(false);
  let streaming = $state("");
  let toolStatus = $state("");
  let toolLog = $state([]);
  let toolCalls = $state([]);
  let thinkingStream = $state("");
  let thinkingDone = $state(false);
  let thinkingDuration = $state(0);
  let executingActions = $state({});
  let executedActions = $state({});
  let chatScope = $state("standard");
  let messagesEl = $state(null);
  let inputComp;

  // WebSocket
  let subscription = null;

  function subscribe() {
    if (subscription) return;
    subscription = consumer.subscriptions.create(
      { channel: "AIChatChannel" },
      {
        received(data) {
          if (data.chat_id !== chatId) return;
          if (data.type === "thinking") {
            thinkingStream += data.content;
          } else if (data.type === "thinking_done") {
            thinkingDone = true;
            thinkingDuration = data.duration;
          } else if (data.type === "tool_use") {
            toolStatus = data.message;
            toolLog = [...toolLog, { tool: data.tool, message: data.message }];
            toolCalls = [...toolCalls, { id: data.tool_call_id, tool: data.tool, message: data.message, status: "running" }];
          } else if (data.type === "tool_result") {
            toolStatus = "";
            toolCalls = toolCalls.map(tc => tc.id === data.tool_call_id ? { ...tc, status: data.status, result: data.message } : tc);
          } else if (data.type === "chunk") {
            toolStatus = "";
            streaming += data.content;
          } else if (data.type === "complete") {
            messages = [...messages, data.message];
            streaming = "";
            sending = false;
            toolStatus = "";
            toolLog = [];
            toolCalls = [];
            thinkingStream = "";
            thinkingDone = false;
          } else if (data.type === "error") {
            messages = [...messages, { role: "assistant", content: data.error }];
            streaming = "";
            sending = false;
            toolCalls = [];
          }
        }
      }
    );
  }

  $effect(() => {
    subscribe();
    return () => { subscription?.unsubscribe(); subscription = null; };
  });

  // Reset when context changes
  $effect(() => {
    if (context) {
      messages = [];
      chatId = null;
      streaming = "";
      input = "";
      toolCalls = [];
      thinkingStream = "";
    }
  });

  export function focus() {
    setTimeout(() => inputComp?.focusInput?.() || document.querySelector(".ai-chat-input textarea")?.focus(), 50);
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    let content = input.trim();

    // Prepend context on first message
    if (messages.length === 0 && (context || appContext)) {
      const parts = [];
      if (appContext) parts.push(appContext);
      if (context) parts.push(`Context:\n${context}`);
      content = parts.join("\n\n") + "\n\nUser question: " + content;
    }

    const userMessage = input.trim();
    input = "";
    references = [];
    sending = true;
    streaming = "";
    thinkingStream = "";
    thinkingDone = false;
    toolCalls = [];

    const token = document.querySelector('meta[name="csrf-token"]')?.content;

    if (!chatId) {
      const res = await fetch("/ai_chats", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify({ context_url: window.location.pathname, model_id: selectedModel }),
      });
      const data = await res.json();
      chatId = data.id;
    }

    messages = [...messages, { role: "user", content: userMessage }];

    await fetch(`/ai_chats/${chatId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ content, references: [] }),
    });
  }

  function stopGenerating() {
    if (streaming) {
      messages = [...messages, { role: "assistant", content: streaming + " _(stopped)_" }];
      streaming = "";
    }
    sending = false;
  }

  function newChat() {
    chatId = null;
    messages = [];
    streaming = "";
    sending = false;
    input = "";
    toolCalls = [];
    thinkingStream = "";
  }

  async function executeAction(action, idx) {
    const key = `${idx}-${JSON.stringify(action)}`;
    if (executingActions[key] || executedActions[key]) return;
    executingActions = { ...executingActions, [key]: true };
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.content;
      const res = await fetch("/ai_chats/execute_action", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify({ action_data: action }),
      });
      const data = await res.json();
      executedActions = { ...executedActions, [key]: data };
    } catch {
      executedActions = { ...executedActions, [key]: { success: false, error: "Failed" } };
    }
    executingActions = { ...executingActions, [key]: false };
  }

  onDestroy(() => {
    subscription?.unsubscribe();
  });
</script>

<div class="ew-ai-chat">
  {#if aiModels.length > 1}
    <div class="ew-ai-model-row">
      <select class="ew-ai-model-select" bind:value={selectedModel} disabled={!!chatId}>
        {#each aiModels as model}
          <option value={model.value}>{model.label}</option>
        {/each}
      </select>
      {#if chatId}
        <button class="ew-ai-new" onclick={newChat} title="New chat">+ New</button>
      {/if}
    </div>
  {/if}

  <AiChatMessages
    {messages}
    {streaming}
    {sending}
    {toolStatus}
    {toolLog}
    {toolCalls}
    {thinkingStream}
    {thinkingDone}
    {thinkingDuration}
    {executingActions}
    {executedActions}
    onExecuteAction={executeAction}
    onStop={stopGenerating}
    onSuggestion={(text) => { input = text; sendMessage(); }}
    onMessagesElReady={el => messagesEl = el}
  />

  <AiChatInput
    bind:input
    bind:references
    bind:chatScope
    {sending}
    {chatId}
    onSend={sendMessage}
    onStop={stopGenerating}
    bind:this={inputComp}
  />
</div>

<style>
  .ew-ai-chat {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 300px;
  }

  .ew-ai-model-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 0.5rem;
  }

  .ew-ai-model-select {
    padding: 0.25rem 1.25rem 0.25rem 0.5rem;
    font-size: 0.6875rem;
    font-weight: 500;
    font-family: inherit;
    border: 1px solid #e5e7eb;
    background: #fff;
    color: #374151;
    outline: none;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.375rem center;

    &:disabled { opacity: 0.6; cursor: not-allowed; }
  }

  .ew-ai-new {
    font-size: 0.6875rem;
    font-weight: 500;
    font-family: inherit;
    padding: 0.25rem 0.5rem;
    border: 1px solid #e5e7eb;
    background: #fff;
    color: #6b7280;
    cursor: pointer;
    margin-left: auto;

    &:hover { background: #f3f4f6; }
  }
</style>

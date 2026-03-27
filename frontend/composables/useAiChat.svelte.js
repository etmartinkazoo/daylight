import { usePage } from "@inertiajs/svelte";
import { consumer } from "@/utils/cable";
import { onDestroy } from "svelte";
import { playNotificationSound } from "@/lib/notification-sounds.js";

export function useAiChat({ autoSubscribe = false } = {}) {
  const pageStore = usePage();

  let aiModels = $derived($pageStore.props.aiModels || []);
  let defaultAiModel = $derived($pageStore.props.defaultAiModel);
  let selectedModel = $state("");

  $effect(() => {
    if (!selectedModel && aiModels.length > 0) {
      if (defaultAiModel && aiModels.find((m) => m.value === defaultAiModel)) {
        selectedModel = defaultAiModel;
      } else {
        selectedModel = aiModels[0].value;
      }
    }
  });

  let chatId = $state(null);
  let messages = $state([]);
  let input = $state("");
  let sending = $state(false);
  let streaming = $state("");
  let toolStatus = $state("");
  let messagesEl = $state(null);
  let inputEl = $state(null);
  let subscription = null;

  // Act mode state
  let panelMode = $state("chat");
  let actOutputType = $state("note");
  let actPrompt = $state("");
  let actSending = $state(false);
  let actProposal = $state(null);
  let actEditContent = $state("");

  // @-mention state
  let references = $state([]);
  let mentionOpen = $state(false);
  let mentionQuery = $state("");
  let mentionResults = $state([]);
  let mentionLoading = $state(false);
  let mentionIndex = $state(0);
  let mentionStartPos = $state(-1);
  let mentionSearchTimer = null;

  // Action execution state
  let executingActions = $state({});
  let executedActions = $state({});

  function detectContext() {
    const url = $pageStore.url || "";
    const props = $pageStore.props || {};
    const fullUrl =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : url;
    const partnerMatch = url.match(/\/partners\/(\d+)/);
    if (partnerMatch)
      return {
        type: "Partner",
        id: parseInt(partnerMatch[1]),
        url: fullUrl,
        name: props.partner?.name,
      };
    const projectMatch = url.match(/\/projects\/(\d+)/);
    if (projectMatch)
      return {
        type: "Project",
        id: parseInt(projectMatch[1]),
        url: fullUrl,
        name: props.project?.name,
      };
    const todoMatch = url.match(/\/todos\/(\d+)/);
    if (todoMatch)
      return {
        type: "Todo",
        id: parseInt(todoMatch[1]),
        url: fullUrl,
        name: props.todo?.name,
      };
    const serviceMatch = url.match(/\/services\/(\d+)/);
    if (serviceMatch)
      return {
        type: "Service",
        id: parseInt(serviceMatch[1]),
        url: fullUrl,
        name: props.service?.name,
      };
    return { type: null, id: null, url: fullUrl, name: null };
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 50);
  }

  function subscribe() {
    if (subscription) return;
    subscription = consumer.subscriptions.create(
      { channel: "AIChatChannel" },
      {
        received(data) {
          if (data.type === "proposal_ready") {
            actSending = false;
            actProposal = {
              content: data.content,
              execution_id: data.execution_id,
            };
            actEditContent = data.content;
            panelMode = "act";
            return;
          }
          if (data.type === "proposal_error") {
            actSending = false;
            actProposal = { error: data.error };
            panelMode = "act";
            return;
          }

          if (data.chat_id !== chatId) return;
          if (data.type === "tool_use") {
            toolStatus = data.message;
            scrollToBottom();
          } else if (data.type === "chunk") {
            toolStatus = "";
            streaming += data.content;
            scrollToBottom();
          } else if (data.type === "complete") {
            toolStatus = "";
            messages = [...messages, data.message];
            streaming = "";
            sending = false;
            scrollToBottom();
            requestAnimationFrame(() => inputEl?.focus());
            playNotificationSound();
          } else if (data.type === "error") {
            messages = [
              ...messages,
              { role: "assistant", content: data.error },
            ];
            streaming = "";
            sending = false;
            requestAnimationFrame(() => inputEl?.focus());
          }
        },
      },
    );
  }

  function unsubscribe() {
    subscription?.unsubscribe();
    subscription = null;
  }

  if (autoSubscribe) {
    $effect(() => {
      subscribe();
      return () => unsubscribe();
    });
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const content = input.trim();
    const refs = [...references];
    input = "";
    references = [];
    sending = true;
    streaming = "";
    closeMention();

    const token = document.querySelector('meta[name="csrf-token"]')?.content;

    if (!chatId) {
      const ctx = detectContext();
      const res = await fetch("/ai_chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({
          context_type: ctx.type,
          context_id: ctx.id,
          context_url: ctx.url,
          model_id: selectedModel,
        }),
      });
      const data = await res.json();
      chatId = data.id;
    }

    const refLabels =
      refs.length > 0
        ? refs.map((r) => `@${r.type}:${r.label}`).join(", ") + "\n"
        : "";
    messages = [...messages, { role: "user", content: refLabels + content }];
    scrollToBottom();

    await fetch(`/ai_chats/${chatId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": token,
      },
      body: JSON.stringify({ content, references: refs }),
    });
  }

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
        if (mentionResults[mentionIndex]) {
          selectMention(mentionResults[mentionIndex]);
        }
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
      sendMessage();
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

  async function searchMentions(q) {
    mentionLoading = true;
    try {
      const token =
        document.querySelector('meta[name="csrf-token"]')?.content;
      const res = await fetch(
        `/ai_chats/mentions?q=${encodeURIComponent(q)}`,
        {
          headers: {
            Accept: "application/json",
            "X-CSRF-Token": token,
          },
        },
      );
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
    const after = input.substring(inputEl?.selectionStart || mentionStartPos);
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

  function closeMention() {
    mentionOpen = false;
    mentionQuery = "";
    mentionResults = [];
    mentionIndex = 0;
    mentionStartPos = -1;
    clearTimeout(mentionSearchTimer);
  }

  function stopGenerating() {
    if (streaming) {
      messages = [
        ...messages,
        { role: "assistant", content: streaming + " _(stopped)_" },
      ];
      streaming = "";
    }
    sending = false;
  }

  function parseActions(content) {
    if (!content) return { text: content, actions: [] };
    const actions = [];
    const regex = /```action\s*\n?([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const raw = match[1].trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          actions.push(JSON.parse(jsonMatch[0]));
        } catch {}
      }
    }
    const text = content.replace(regex, "").trim();
    return { text, actions };
  }

  function actionLabel(action) {
    switch (action.type) {
      case "update_todo":
        return `Update todo #${action.id}`;
      case "create_todo":
        return `Create todo "${action.name}"`;
      case "complete_todo":
        return `Complete todo #${action.id}`;
      case "assign_todo":
        return `Assign todo #${action.id}`;
      case "create_note":
        return `Add note to todo #${action.todo_id}`;
      case "log_time":
        return `Log ${action.minutes}m on todo #${action.todo_id}`;
      default:
        return action.type;
    }
  }

  async function executeAction(action, idx) {
    const key = `${idx}-${JSON.stringify(action)}`;
    if (executingActions[key] || executedActions[key]) return;
    executingActions = { ...executingActions, [key]: true };

    try {
      const token =
        document.querySelector('meta[name="csrf-token"]')?.content;
      const res = await fetch("/ai_chats/execute_action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({ action_data: action }),
      });
      const data = await res.json();
      executedActions = { ...executedActions, [key]: data };
    } catch (e) {
      executedActions = {
        ...executedActions,
        [key]: { success: false, error: "Failed to execute" },
      };
    }
    executingActions = { ...executingActions, [key]: false };
  }

  function newChat() {
    chatId = null;
    messages = [];
    streaming = "";
    sending = false;
    input = "";
    references = [];
    toolStatus = "";
    executingActions = {};
    executedActions = {};
    closeMention();
    inputEl?.focus();
  }

  async function deleteChat() {
    if (chatId) {
      const token =
        document.querySelector('meta[name="csrf-token"]')?.content;
      await fetch(`/ai_chats/${chatId}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": token },
      }).catch(() => {});
    }
    newChat();
  }

  async function loadChat(id) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    try {
      const res = await fetch(`/ai_chats/${id}`, {
        headers: { Accept: "application/json", "X-CSRF-Token": token },
      });
      if (res.ok) {
        const data = await res.json();
        chatId = data.id;
        messages = data.messages || [];
        streaming = "";
        sending = false;
        input = "";
        references = [];
        toolStatus = "";
        executingActions = {};
        executedActions = {};
        closeMention();
        scrollToBottom();
      }
    } catch {}
  }

  async function generateProposal() {
    if (actSending) return;
    actSending = true;
    actProposal = null;

    const ctx = detectContext();
    const token = document.querySelector('meta[name="csrf-token"]')?.content;

    let chatContext = "";
    if (messages.length > 0) {
      chatContext = messages
        .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
        .join("\n");
    }

    try {
      const res = await fetch("/ai_chats/generate_proposal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({
          context_type: ctx.type,
          context_id: ctx.id,
          context_url: ctx.url,
          output_type: actOutputType,
          extra_prompt: actPrompt,
          chat_context: chatContext,
          model_id: selectedModel,
        }),
      });
      const data = await res.json();
      if (data.error) {
        actProposal = { error: data.error };
      } else {
        actProposal = data;
        actEditContent = data.content || "";
      }
    } catch (e) {
      actProposal = { error: "Failed to generate proposal" };
    }
    actSending = false;
  }

  async function approveProposal() {
    if (!actProposal?.execution_id) return;
    const token = document.querySelector('meta[name="csrf-token"]')?.content;

    try {
      await fetch("/ai_chats/approve_proposal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": token,
        },
        body: JSON.stringify({
          execution_id: actProposal.execution_id,
          modifications:
            actEditContent !== actProposal.content ? actEditContent : null,
        }),
      });
      actProposal = { approved: true };
      setTimeout(() => {
        actProposal = null;
        actPrompt = "";
        actEditContent = "";
        panelMode = "chat";
      }, 2000);
    } catch {
      actProposal = { ...actProposal, error: "Failed to approve" };
    }
  }

  function rejectProposal() {
    actProposal = null;
    actEditContent = "";
  }

  function formatContent(text) {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  }

  function typeIcon(type) {
    switch (type) {
      case "Partner":
        return "P";
      case "Project":
        return "Pj";
      case "Service":
        return "Sv";
      case "Todo":
        return "T";
      case "Doc":
        return "D";
      case "File":
        return "F";
      case "Dir":
        return "/";
      case "Milestone":
        return "M";
      case "Group":
        return "G";
      case "Repo":
        return "R";
      default:
        return "@";
    }
  }

  function typeColor(type) {
    switch (type) {
      case "Partner":
        return "var(--color-info)";
      case "Project":
        return "var(--color-purple)";
      case "Service":
        return "var(--color-success)";
      case "Todo":
        return "var(--color-warning)";
      case "Doc":
        return "var(--color-primary)";
      case "Milestone":
        return "var(--color-purple)";
      case "Group":
        return "var(--color-success)";
      case "File":
        return "var(--color-muted)";
      case "Dir":
        return "var(--color-muted)";
      default:
        return "var(--color-muted)";
    }
  }

  onDestroy(() => {
    unsubscribe();
    clearTimeout(mentionSearchTimer);
  });

  return {
    // State (getters)
    get aiModels() { return aiModels; },
    get selectedModel() { return selectedModel; },
    set selectedModel(v) { selectedModel = v; },
    get chatId() { return chatId; },
    get messages() { return messages; },
    get input() { return input; },
    set input(v) { input = v; },
    get sending() { return sending; },
    get streaming() { return streaming; },
    get toolStatus() { return toolStatus; },
    get messagesEl() { return messagesEl; },
    set messagesEl(v) { messagesEl = v; },
    get inputEl() { return inputEl; },
    set inputEl(v) { inputEl = v; },
    get panelMode() { return panelMode; },
    set panelMode(v) { panelMode = v; },
    get actOutputType() { return actOutputType; },
    set actOutputType(v) { actOutputType = v; },
    get actPrompt() { return actPrompt; },
    set actPrompt(v) { actPrompt = v; },
    get actSending() { return actSending; },
    get actProposal() { return actProposal; },
    set actProposal(v) { actProposal = v; },
    get actEditContent() { return actEditContent; },
    set actEditContent(v) { actEditContent = v; },
    get references() { return references; },
    get mentionOpen() { return mentionOpen; },
    get mentionQuery() { return mentionQuery; },
    get mentionResults() { return mentionResults; },
    get mentionLoading() { return mentionLoading; },
    get mentionIndex() { return mentionIndex; },
    set mentionIndex(v) { mentionIndex = v; },
    get executingActions() { return executingActions; },
    get executedActions() { return executedActions; },

    // Functions
    subscribe,
    unsubscribe,
    sendMessage,
    handleKeydown,
    handleInput,
    selectMention,
    removeReference,
    closeMention,
    stopGenerating,
    parseActions,
    actionLabel,
    executeAction,
    newChat,
    deleteChat,
    loadChat,
    generateProposal,
    approveProposal,
    rejectProposal,
    formatContent,
    typeIcon,
    typeColor,
    detectContext,
    scrollToBottom,
  };
}

import { useState, useEffect, useRef, useCallback } from "react";
import { usePage } from "@inertiajs/react";
import { consumer } from "@/utils/cable";
import { playNotificationSound } from "@/lib/notification-sounds.js";

export function useAiChat({ autoSubscribe = false } = {}) {
  const { props, url } = usePage();
  const aiModels = props.aiModels || [];
  const defaultAiModel = props.defaultAiModel;

  const [selectedModel, setSelectedModel] = useState(() => {
    if (defaultAiModel && aiModels.find((m) => m.value === defaultAiModel)) return defaultAiModel;
    return aiModels[0]?.value || "";
  });

  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [toolStatus, setToolStatus] = useState("");
  const [references, setReferences] = useState([]);
  const [executingActions, setExecutingActions] = useState({});
  const [executedActions, setExecutedActions] = useState({});
  const [panelMode, setPanelMode] = useState("chat");
  const [actOutputType, setActOutputType] = useState("note");
  const [actPrompt, setActPrompt] = useState("");
  const [actSending, setActSending] = useState(false);
  const [actProposal, setActProposal] = useState(null);
  const [actEditContent, setActEditContent] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);

  const messagesElRef = useRef(null);
  const inputElRef = useRef(null);
  const subscriptionRef = useRef(null);
  const mentionStartPosRef = useRef(-1);
  const mentionSearchTimerRef = useRef(null);
  const chatIdRef = useRef(null);
  const streamingRef = useRef("");

  // Keep refs in sync
  useEffect(() => { chatIdRef.current = chatId; }, [chatId]);
  useEffect(() => { streamingRef.current = streaming; }, [streaming]);

  function scrollToBottom() {
    setTimeout(() => {
      if (messagesElRef.current) {
        messagesElRef.current.scrollTop = messagesElRef.current.scrollHeight;
      }
    }, 50);
  }

  function detectContext() {
    const fullUrl = typeof window !== "undefined" ? window.location.pathname + window.location.search : url;
    const partnerMatch = url.match(/\/partners\/(\d+)/);
    if (partnerMatch) return { type: "Partner", id: parseInt(partnerMatch[1]), url: fullUrl, name: props.partner?.name };
    const projectMatch = url.match(/\/projects\/(\d+)/);
    if (projectMatch) return { type: "Project", id: parseInt(projectMatch[1]), url: fullUrl, name: props.project?.name };
    const todoMatch = url.match(/\/todos\/(\d+)/);
    if (todoMatch) return { type: "Todo", id: parseInt(todoMatch[1]), url: fullUrl, name: props.todo?.name };
    const serviceMatch = url.match(/\/services\/(\d+)/);
    if (serviceMatch) return { type: "Service", id: parseInt(serviceMatch[1]), url: fullUrl, name: props.service?.name };
    return { type: null, id: null, url: fullUrl, name: null };
  }

  function subscribe() {
    if (subscriptionRef.current) return;
    subscriptionRef.current = consumer.subscriptions.create(
      { channel: "AIChatChannel" },
      {
        received(data) {
          if (data.type === "proposal_ready") {
            setActSending(false);
            setActProposal({ content: data.content, execution_id: data.execution_id });
            setActEditContent(data.content);
            setPanelMode("act");
            return;
          }
          if (data.type === "proposal_error") {
            setActSending(false);
            setActProposal({ error: data.error });
            setPanelMode("act");
            return;
          }
          if (data.chat_id !== chatIdRef.current) return;
          if (data.type === "tool_use") {
            setToolStatus(data.message);
            scrollToBottom();
          } else if (data.type === "chunk") {
            setToolStatus("");
            setStreaming((prev) => prev + data.content);
            scrollToBottom();
          } else if (data.type === "complete") {
            setToolStatus("");
            setMessages((prev) => [...prev, data.message]);
            setStreaming("");
            setSending(false);
            scrollToBottom();
            requestAnimationFrame(() => inputElRef.current?.focus());
            playNotificationSound();
          } else if (data.type === "error") {
            setMessages((prev) => [...prev, { role: "assistant", content: data.error }]);
            setStreaming("");
            setSending(false);
            requestAnimationFrame(() => inputElRef.current?.focus());
          }
        },
      }
    );
  }

  function unsubscribe() {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
  }

  useEffect(() => {
    if (autoSubscribe) {
      subscribe();
      return () => unsubscribe();
    }
  }, []);

  function closeMention() {
    setMentionOpen(false);
    setMentionQuery("");
    setMentionResults([]);
    setMentionIndex(0);
    mentionStartPosRef.current = -1;
    clearTimeout(mentionSearchTimerRef.current);
  }

  async function searchMentions(q) {
    setMentionLoading(true);
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.content;
      const res = await fetch(`/ai_chats/mentions?q=${encodeURIComponent(q)}`, {
        headers: { Accept: "application/json", "X-CSRF-Token": token },
      });
      if (res.ok) {
        const data = await res.json();
        setMentionResults(data.results || []);
        setMentionIndex(0);
      }
    } catch {}
    setMentionLoading(false);
  }

  function debouncedSearch(q) {
    clearTimeout(mentionSearchTimerRef.current);
    mentionSearchTimerRef.current = setTimeout(() => searchMentions(q), 200);
  }

  function selectMention(item) {
    const before = input.substring(0, mentionStartPosRef.current);
    const after = input.substring(inputElRef.current?.selectionStart || mentionStartPosRef.current);
    setInput(before + after);
    setReferences((prev) => {
      const exists = prev.some((r) => r.type === item.type && r.id === item.id && r.path === item.path);
      return exists ? prev : [...prev, item];
    });
    closeMention();
    setTimeout(() => inputElRef.current?.focus(), 10);
  }

  function removeReference(index) {
    setReferences((prev) => prev.filter((_, i) => i !== index));
    inputElRef.current?.focus();
  }

  function handleKeydown(e) {
    if (mentionOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, mentionResults.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (mentionResults[mentionIndex]) selectMention(mentionResults[mentionIndex]); return; }
      if (e.key === "Escape") { e.preventDefault(); closeMention(); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleInput(e) {
    const el = e.target;
    const val = el.value;
    const pos = el.selectionStart;
    setInput(val);

    if (mentionOpen) {
      const textSinceTrigger = val.substring(mentionStartPosRef.current + 1, pos);
      if (textSinceTrigger.includes(" ") || pos <= mentionStartPosRef.current) {
        closeMention();
      } else {
        setMentionQuery(textSinceTrigger);
        debouncedSearch(textSinceTrigger);
      }
    } else if (pos > 0 && val[pos - 1] === "@") {
      if (pos === 1 || val[pos - 2] === " " || val[pos - 2] === "\n") {
        mentionStartPosRef.current = pos - 1;
        setMentionOpen(true);
        setMentionQuery("");
        setMentionIndex(0);
        searchMentions("");
      }
    }
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const content = input.trim();
    const refs = [...references];
    setInput("");
    setReferences([]);
    setSending(true);
    setStreaming("");
    closeMention();

    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    let currentChatId = chatIdRef.current;

    if (!currentChatId) {
      const ctx = detectContext();
      const res = await fetch("/ai_chats", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify({ context_type: ctx.type, context_id: ctx.id, context_url: ctx.url, model_id: selectedModel }),
      });
      const data = await res.json();
      currentChatId = data.id;
      setChatId(data.id);
    }

    const refLabels = refs.length > 0 ? refs.map((r) => `@${r.type}:${r.label}`).join(", ") + "\n" : "";
    setMessages((prev) => [...prev, { role: "user", content: refLabels + content }]);
    scrollToBottom();

    await fetch(`/ai_chats/${currentChatId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ content, references: refs }),
    });
  }

  function stopGenerating() {
    if (streamingRef.current) {
      setMessages((prev) => [...prev, { role: "assistant", content: streamingRef.current + " _(stopped)_" }]);
      setStreaming("");
    }
    setSending(false);
  }

  async function executeAction(action, idx) {
    const key = `${idx}-${JSON.stringify(action)}`;
    if (executingActions[key] || executedActions[key]) return;
    setExecutingActions((prev) => ({ ...prev, [key]: true }));
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.content;
      const res = await fetch("/ai_chats/execute_action", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify({ action_data: action }),
      });
      const data = await res.json();
      setExecutedActions((prev) => ({ ...prev, [key]: data }));
    } catch {
      setExecutedActions((prev) => ({ ...prev, [key]: { success: false, error: "Failed to execute" } }));
    }
    setExecutingActions((prev) => ({ ...prev, [key]: false }));
  }

  function newChat() {
    setChatId(null);
    setMessages([]);
    setStreaming("");
    setSending(false);
    setInput("");
    setReferences([]);
    setToolStatus("");
    setExecutingActions({});
    setExecutedActions({});
    closeMention();
    inputElRef.current?.focus();
  }

  async function deleteChat() {
    if (chatIdRef.current) {
      const token = document.querySelector('meta[name="csrf-token"]')?.content;
      await fetch(`/ai_chats/${chatIdRef.current}`, { method: "DELETE", headers: { "X-CSRF-Token": token } }).catch(() => {});
    }
    newChat();
  }

  async function loadChat(id) {
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    try {
      const res = await fetch(`/ai_chats/${id}`, { headers: { Accept: "application/json", "X-CSRF-Token": token } });
      if (res.ok) {
        const data = await res.json();
        setChatId(data.id);
        setMessages(data.messages || []);
        setStreaming("");
        setSending(false);
        setInput("");
        setReferences([]);
        setToolStatus("");
        setExecutingActions({});
        setExecutedActions({});
        closeMention();
        scrollToBottom();
      }
    } catch {}
  }

  async function generateProposal() {
    if (actSending) return;
    setActSending(true);
    setActProposal(null);
    const ctx = detectContext();
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    const chatContext = messages.length > 0
      ? messages.map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`).join("\n")
      : "";
    try {
      const res = await fetch("/ai_chats/generate_proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify({ context_type: ctx.type, context_id: ctx.id, context_url: ctx.url, output_type: actOutputType, extra_prompt: actPrompt, chat_context: chatContext, model_id: selectedModel }),
      });
      const data = await res.json();
      if (data.error) { setActProposal({ error: data.error }); }
      else { setActProposal(data); setActEditContent(data.content || ""); }
    } catch { setActProposal({ error: "Failed to generate proposal" }); }
    setActSending(false);
  }

  async function approveProposal() {
    if (!actProposal?.execution_id) return;
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    try {
      await fetch("/ai_chats/approve_proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify({ execution_id: actProposal.execution_id, modifications: actEditContent !== actProposal.content ? actEditContent : null }),
      });
      setActProposal({ approved: true });
      setTimeout(() => { setActProposal(null); setActPrompt(""); setActEditContent(""); setPanelMode("chat"); }, 2000);
    } catch { setActProposal((prev) => ({ ...prev, error: "Failed to approve" })); }
  }

  function rejectProposal() { setActProposal(null); setActEditContent(""); }

  return {
    aiModels, selectedModel, setSelectedModel,
    chatId, messages, input, setInput, sending, streaming, toolStatus,
    references, mentionOpen, mentionQuery, mentionResults, mentionLoading, mentionIndex, setMentionIndex,
    executingActions, executedActions,
    panelMode, setPanelMode, actOutputType, setActOutputType, actPrompt, setActPrompt, actSending, actProposal, setActProposal, actEditContent, setActEditContent,
    messagesElRef, inputElRef,
    subscribe, unsubscribe, sendMessage, handleKeydown, handleInput,
    selectMention, removeReference, closeMention,
    stopGenerating, executeAction, newChat, deleteChat, loadChat,
    generateProposal, approveProposal, rejectProposal, scrollToBottom,
  };
}

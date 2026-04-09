import { useState, useRef, useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { consumer } from "@/utils/cable";
import AiChatMessages from "@/components/ai-chat/AiChatMessages";
import AiChatInput from "@/components/ai-chat/AiChatInput";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { playNotificationSound } from "@/lib/notification-sounds.js";

export default function EwAiChat({ context = "", appContext = "" }) {
  const { props } = usePage();
  const aiModels = props.aiModels || [];
  const defaultAiModel = props.defaultAiModel || "";

  const [selectedModel, setSelectedModel] = useState(() => defaultAiModel || aiModels[0]?.value || "");
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [references, setReferences] = useState([]);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [toolStatus, setToolStatus] = useState("");
  const [toolLog, setToolLog] = useState([]);
  const [toolCalls, setToolCalls] = useState([]);
  const [thinkingStream, setThinkingStream] = useState("");
  const [thinkingDone, setThinkingDone] = useState(false);
  const [thinkingDuration, setThinkingDuration] = useState(0);
  const [executingActions, setExecutingActions] = useState({});
  const [executedActions, setExecutedActions] = useState({});
  const [chatScope, setChatScope] = useState("standard");

  const chatIdRef = useRef(null);
  const subscriptionRef = useRef(null);
  const inputElRef = useRef(null);

  useEffect(() => { chatIdRef.current = chatId; }, [chatId]);

  useEffect(() => {
    if (context) {
      setMessages([]);
      setChatId(null);
      setStreaming("");
      setInput("");
      setToolCalls([]);
      setThinkingStream("");
    }
  }, [context]);

  useEffect(() => {
    if (subscriptionRef.current) return;
    subscriptionRef.current = consumer.subscriptions.create(
      { channel: "AIChatChannel" },
      {
        received(data) {
          if (data.chat_id !== chatIdRef.current) return;
          if (data.type === "thinking") {
            setThinkingStream((prev) => prev + data.content);
          } else if (data.type === "thinking_done") {
            setThinkingDone(true);
            setThinkingDuration(data.duration);
          } else if (data.type === "tool_use") {
            setToolStatus(data.message);
            setToolLog((prev) => [...prev, { tool: data.tool, message: data.message }]);
            setToolCalls((prev) => [...prev, { id: data.tool_call_id, tool: data.tool, message: data.message, status: "running" }]);
          } else if (data.type === "tool_result") {
            setToolStatus("");
            setToolCalls((prev) => prev.map((tc) => tc.id === data.tool_call_id ? { ...tc, status: data.status, result: data.message } : tc));
          } else if (data.type === "chunk") {
            setToolStatus("");
            setStreaming((prev) => prev + data.content);
          } else if (data.type === "complete") {
            setMessages((prev) => [...prev, data.message]);
            setStreaming("");
            setSending(false);
            setToolStatus("");
            setToolLog([]);
            setToolCalls([]);
            setThinkingStream("");
            setThinkingDone(false);
            requestAnimationFrame(() => inputElRef.current?.focus());
            playNotificationSound();
          } else if (data.type === "error") {
            setMessages((prev) => [...prev, { role: "assistant", content: data.error }]);
            setStreaming("");
            setSending(false);
            setToolCalls([]);
            requestAnimationFrame(() => inputElRef.current?.focus());
          }
        },
      }
    );
    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, []);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    let content = input.trim();

    if (messages.length === 0 && (context || appContext)) {
      const parts = [];
      if (appContext) parts.push(appContext);
      if (context) parts.push(`Context:\n${context}`);
      content = parts.join("\n\n") + "\n\nUser question: " + content;
    }

    const userMessage = input.trim();
    setInput("");
    setReferences([]);
    setSending(true);
    setStreaming("");
    setThinkingStream("");
    setThinkingDone(false);
    setToolCalls([]);

    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    let currentChatId = chatIdRef.current;

    if (!currentChatId) {
      const res = await fetch("/ai_chats", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify({ context_url: window.location.pathname, model_id: selectedModel }),
      });
      const data = await res.json();
      currentChatId = data.id;
      setChatId(data.id);
    }

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    await fetch(`/ai_chats/${currentChatId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ content, references: [] }),
    });
  }

  function stopGenerating() {
    if (streaming) {
      setMessages((prev) => [...prev, { role: "assistant", content: streaming + " _(stopped)_" }]);
      setStreaming("");
    }
    setSending(false);
  }

  function newChat() {
    setChatId(null);
    setMessages([]);
    setStreaming("");
    setSending(false);
    setInput("");
    setToolCalls([]);
    setThinkingStream("");
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
      setExecutedActions((prev) => ({ ...prev, [key]: { success: false, error: "Failed" } }));
    }
    setExecutingActions((prev) => ({ ...prev, [key]: false }));
  }

  return (
    <div className="flex flex-col h-full">
      {aiModels.length > 1 && (
        <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
          <Select value={selectedModel} onValueChange={setSelectedModel} disabled={!!chatId}>
            <SelectTrigger className="h-7 text-sm flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aiModels.map((model) => (
                <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {chatId && (
            <Button variant="ghost" size="xs" onClick={newChat}>
              + New
            </Button>
          )}
        </div>
      )}

      <AiChatMessages
        messages={messages}
        streaming={streaming}
        sending={sending}
        toolStatus={toolStatus}
        toolLog={toolLog}
        toolCalls={toolCalls}
        thinkingStream={thinkingStream}
        thinkingDone={thinkingDone}
        thinkingDuration={thinkingDuration}
        executingActions={executingActions}
        executedActions={executedActions}
        onExecuteAction={executeAction}
        onStop={stopGenerating}
        onSuggestion={(text) => { setInput(text); sendMessage(); }}
      />

      <AiChatInput
        input={input}
        onInputChange={setInput}
        references={references}
        onReferencesChange={setReferences}
        chatScope={chatScope}
        onChatScopeChange={setChatScope}
        sending={sending}
        chatId={chatId}
        onSend={sendMessage}
        onStop={stopGenerating}
      />
    </div>
  );
}

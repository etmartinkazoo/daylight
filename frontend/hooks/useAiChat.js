import { useState, useEffect, useRef, useCallback } from "react";
import { usePage } from "@inertiajs/react";
import { consumer } from "@/utils/cable";
import { playNotificationSound } from "@/lib/notification-sounds.js";

export function useAiChat({ context = "", onComplete } = {}) {
  const { props } = usePage();
  const base = props.base_path || "/daylight";
  const aiModels = props.aiModels || [];
  const defaultAiModel = props.defaultAiModel || "";

  const [selectedModel, setSelectedModel] = useState(() => defaultAiModel || aiModels[0]?.value || "");
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [toolStatus, setToolStatus] = useState("");

  const chatIdRef = useRef(null);
  const subscriptionRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { chatIdRef.current = chatId; }, [chatId]);

  // Subscribe to ActionCable channel
  useEffect(() => {
    subscriptionRef.current = consumer.subscriptions.create(
      { channel: "Daylight::AiChatChannel" },
      {
        received(data) {
          if (data.chat_id !== chatIdRef.current) return;

          switch (data.type) {
            case "chunk":
              setToolStatus("");
              setStreaming((prev) => prev + data.content);
              break;
            case "tool_use":
              setToolStatus(data.message);
              break;
            case "tool_result":
              setToolStatus("");
              break;
            case "complete":
              setToolStatus("");
              setMessages((prev) => [...prev, data.message]);
              setStreaming("");
              setSending(false);
              requestAnimationFrame(() => inputRef.current?.focus());
              playNotificationSound();
              onComplete?.();
              break;
            case "error":
              setMessages((prev) => [...prev, { role: "assistant", content: data.error }]);
              setStreaming("");
              setSending(false);
              requestAnimationFrame(() => inputRef.current?.focus());
              break;
          }
        },
      }
    );

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, []);

  const csrfToken = useCallback(() => {
    return document.querySelector('meta[name="csrf-token"]')?.content;
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;

    let content = input.trim();
    const userMessage = content;

    // Prepend context on first message
    if (messages.length === 0 && context) {
      content = `Context:\n${context}\n\nUser question: ${content}`;
    }

    setInput("");
    setSending(true);
    setStreaming("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    const token = csrfToken();
    let currentChatId = chatIdRef.current;

    // Create chat if needed
    if (!currentChatId) {
      try {
        const res = await fetch(`${base}/ai/chats`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
          body: JSON.stringify({ model_id: selectedModel, context_url: window.location.pathname }),
        });
        const data = await res.json();
        currentChatId = data.id;
        setChatId(data.id);
      } catch {
        setSending(false);
        setMessages((prev) => [...prev, { role: "assistant", content: "Failed to create chat session." }]);
        return;
      }
    }

    // Send message
    await fetch(`${base}/ai/chats/${currentChatId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ content }),
    });
  }, [input, sending, messages, context, selectedModel, base, csrfToken]);

  const newChat = useCallback(() => {
    setChatId(null);
    setMessages([]);
    setStreaming("");
    setSending(false);
    setInput("");
    setToolStatus("");
    inputRef.current?.focus();
  }, []);

  const handleKeydown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return {
    aiModels,
    selectedModel,
    setSelectedModel,
    chatId,
    messages,
    input,
    setInput,
    sending,
    streaming,
    toolStatus,
    inputRef,
    sendMessage,
    newChat,
    handleKeydown,
  };
}

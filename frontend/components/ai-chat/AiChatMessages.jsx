import { useState, useRef, useEffect } from "react";
import AiMessageBubble from "./AiMessageBubble";
import ToolCard from "./ToolCard";
import ReasoningBlock from "./ReasoningBlock";
import { formatContent } from "./utils.js";

export default function AiChatMessages({
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
}) {
  const messagesRef = useRef(null);
  const [showThinking, setShowThinking] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    if (messagesRef.current) onMessagesElReady?.(messagesRef.current);
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      setTimeout(() => messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" }), 50);
    }
  }, [messages.length, streaming, sending]);

  function handleScroll() {
    if (!messagesRef.current) return;
    const threshold = 80;
    const { scrollHeight, scrollTop, clientHeight } = messagesRef.current;
    setIsAtBottom(scrollHeight - scrollTop - clientHeight < threshold);
  }

  function scrollToBottom() {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }

  function handleClick(e) {
    const link = e.target.closest(".ai-record-link");
    if (link) {
      e.preventDefault();
      onRecordLinkClick?.(link.dataset.type, parseInt(link.dataset.id));
    }
  }

  const AssistantAvatar = () => (
    <div className="msg-avatar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    </div>
  );

  return (
    <>
      <div className="ai-messages" ref={messagesRef} onClick={handleClick} onScroll={handleScroll}>
        {messages.length === 0 && !streaming && (
          <div className="ai-empty">
            <p className="ai-empty-title">How can I help?</p>
            <p className="ai-empty-hint">Type <kbd>@</kbd> to reference partners, projects, todos, docs, or files.</p>
            <div className="ai-shortcuts">
              <kbd>@</kbd> to mention &nbsp;&middot;&nbsp; <kbd>&#8984;</kbd><kbd>&#8679;</kbd><kbd>A</kbd> to toggle
            </div>
          </div>
        )}

        {messages.map((msg, msgIdx) => (
          <div key={msgIdx}>
            {msg.role === "assistant" && msg.toolCalls?.length > 0 && (
              <div className="tool-cards">
                {msg.toolCalls.map((tc) => (
                  <ToolCard key={tc.id} tool={tc.tool} message={tc.message} arguments={tc.arguments} status={tc.status} result={tc.result} />
                ))}
              </div>
            )}
            <AiMessageBubble
              msg={msg}
              msgIdx={msgIdx}
              executingActions={executingActions}
              executedActions={executedActions}
              onExecuteAction={onExecuteAction}
              onRetry={msg.role === "assistant" && msgIdx === messages.length - 1 ? onRetry : undefined}
              onSuggestion={onSuggestion}
              isLast={msgIdx === messages.length - 1}
            />
          </div>
        ))}

        {toolCalls.length > 0 && sending && (
          <div className="tool-cards">
            {toolCalls.map((tc) => (
              <ToolCard key={tc.id} tool={tc.tool} message={tc.message} arguments={tc.arguments} status={tc.status} result={tc.result} />
            ))}
          </div>
        )}

        {thinkingStream && sending && (
          <div className="msg msg-assistant">
            <AssistantAvatar />
            <div className="msg-body">
              <span className="msg-role">Assistant</span>
              <ReasoningBlock content={thinkingStream} isStreaming={!thinkingDone} isDone={thinkingDone} duration={thinkingDuration} />
              {streaming && (
                <div className="msg-content" dangerouslySetInnerHTML={{ __html: formatContent(streaming) + '<span class="cursor-blink"></span>' }} />
              )}
            </div>
          </div>
        )}

        {!thinkingStream && streaming && (
          <div className="msg msg-assistant">
            <AssistantAvatar />
            <div className="msg-body">
              <span className="msg-role">Assistant</span>
              <div className="msg-content" dangerouslySetInnerHTML={{ __html: formatContent(streaming) + '<span class="cursor-blink"></span>' }} />
            </div>
          </div>
        )}

        {sending && !streaming && !thinkingStream && (
          <div className="msg msg-assistant">
            <AssistantAvatar />
            <div className="msg-body">
              <span className="msg-role">Assistant</span>
              <div className="thinking-row">
                {toolStatus ? (
                  <div className="tool-status">
                    <span className="tool-spinner" />
                    <span>{toolStatus}</span>
                  </div>
                ) : (
                  <div className="thinking-dots">
                    <span className="dot" /><span className="dot" /><span className="dot" />
                  </div>
                )}
                {toolLog.length > 0 && (
                  <button className="see-thinking-btn" onClick={() => setShowThinking(!showThinking)}>
                    {showThinking ? "Hide" : "See Thinking"}
                  </button>
                )}
              </div>
              {showThinking && toolLog.length > 0 && (
                <div className="thinking-log">
                  <div className="thinking-log-title">Activity</div>
                  {toolLog.map((entry, i) => (
                    <div key={i} className="thinking-log-entry">
                      <span className="thinking-log-tool">{entry.tool}</span>
                      <span className="thinking-log-msg">{entry.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {sending && (
        <div className="ai-stop-bar">
          <button className="ai-stop-btn" onClick={onStop}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="2" width="8" height="8" rx="1.5"/></svg>
            Stop generating
          </button>
        </div>
      )}

      {!isAtBottom && messages.length > 0 && (
        <button className="scroll-bottom-btn" onClick={scrollToBottom}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8 3v10M4 9l4 4 4-4"/>
          </svg>
        </button>
      )}
    </>
  );
}

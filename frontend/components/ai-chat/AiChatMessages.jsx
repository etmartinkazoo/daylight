import { useState, useRef, useEffect } from "react";
import AiMessageBubble from "./AiMessageBubble";
import ToolCard from "./ToolCard";
import ReasoningBlock from "./ReasoningBlock";
import { Button } from "@/components/ui/button";
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
    <div className="w-6 h-6 shrink-0 rounded-full bg-muted flex items-center justify-center text-muted-foreground mt-0.5">
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    </div>
  );

  return (
    <>
      <div className="relative flex-1 min-h-0">
        <div
          ref={messagesRef}
          className="h-full overflow-y-auto p-4 flex flex-col gap-4"
          onClick={handleClick}
          onScroll={handleScroll}
        >
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center flex-1">
              <p className="text-sm font-semibold text-foreground">How can I help?</p>
              <p className="text-sm text-muted-foreground">
                Type <kbd className="px-1 py-0.5 rounded bg-muted text-sm font-mono">@</kbd> to reference partners, projects, todos, docs, or files.
              </p>
              <p className="text-sm text-muted-foreground/60">
                <kbd className="px-1 py-0.5 rounded bg-muted text-sm font-mono">@</kbd> to mention &nbsp;&middot;&nbsp;{" "}
                <kbd className="px-1 py-0.5 rounded bg-muted text-sm font-mono">⌘</kbd>
                <kbd className="px-1 py-0.5 rounded bg-muted text-sm font-mono">⇧</kbd>
                <kbd className="px-1 py-0.5 rounded bg-muted text-sm font-mono">A</kbd> to toggle
              </p>
            </div>
          )}

          {messages.map((msg, msgIdx) => (
            <div key={msgIdx}>
              {msg.role === "assistant" && msg.toolCalls?.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-2">
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
            <div className="flex flex-col gap-1.5">
              {toolCalls.map((tc) => (
                <ToolCard key={tc.id} tool={tc.tool} message={tc.message} arguments={tc.arguments} status={tc.status} result={tc.result} />
              ))}
            </div>
          )}

          {thinkingStream && sending && (
            <div className="flex gap-3 items-start">
              <AssistantAvatar />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <span className="text-sm font-semibold text-muted-foreground">Assistant</span>
                <ReasoningBlock content={thinkingStream} isStreaming={!thinkingDone} isDone={thinkingDone} duration={thinkingDuration} />
                {streaming && (
                  <div className="msg-content text-sm" dangerouslySetInnerHTML={{ __html: formatContent(streaming) + '<span class="cursor-blink"></span>' }} />
                )}
              </div>
            </div>
          )}

          {!thinkingStream && streaming && (
            <div className="flex gap-3 items-start">
              <AssistantAvatar />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <span className="text-sm font-semibold text-muted-foreground">Assistant</span>
                <div className="msg-content text-sm" dangerouslySetInnerHTML={{ __html: formatContent(streaming) + '<span class="cursor-blink"></span>' }} />
              </div>
            </div>
          )}

          {sending && !streaming && !thinkingStream && (
            <div className="flex gap-3 items-start">
              <AssistantAvatar />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <span className="text-sm font-semibold text-muted-foreground">Assistant</span>
                <div className="flex items-center gap-2">
                  {toolStatus ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      <span>{toolStatus}</span>
                    </div>
                  ) : (
                    <div className="flex gap-1 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                    </div>
                  )}
                  {toolLog.length > 0 && (
                    <Button variant="link" size="xs" className="h-auto p-0" onClick={() => setShowThinking(!showThinking)}>
                      {showThinking ? "Hide" : "See Thinking"}
                    </Button>
                  )}
                </div>
                {showThinking && toolLog.length > 0 && (
                  <div className="mt-1 text-sm bg-muted/50 rounded-md p-2 flex flex-col gap-1">
                    <div className="font-semibold text-muted-foreground text-sm">Activity</div>
                    {toolLog.map((entry, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-muted-foreground font-mono shrink-0">{entry.tool}</span>
                        <span className="text-foreground">{entry.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {!isAtBottom && messages.length > 0 && (
          <Button
            variant="outline"
            size="icon-xs"
            className="absolute bottom-4 right-4 rounded-full shadow-sm"
            onClick={scrollToBottom}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3v10M4 9l4 4 4-4"/>
            </svg>
          </Button>
        )}
      </div>

      {sending && (
        <div className="shrink-0 flex items-center justify-center p-2 border-t">
          <Button variant="ghost" size="xs" onClick={onStop}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"><rect x="2" y="2" width="8" height="8" rx="1.5"/></svg>
            Stop generating
          </Button>
        </div>
      )}
    </>
  );
}

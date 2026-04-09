import { useState } from "react";
import AiActionCard from "./AiActionCard";
import ReasoningBlock from "./ReasoningBlock";
import SourcesBlock from "./SourcesBlock";
import SuggestionsBar from "./SuggestionsBar";
import ArtifactBlock from "./ArtifactBlock";
import { Button } from "@/components/ui/button";
import { formatContent, parseActions, extractArtifacts, extractSources, contextualSuggestions } from "./utils.js";

export default function AiMessageBubble({
  msg, msgIdx,
  executingActions = {}, executedActions = {},
  onExecuteAction, onRetry, onSuggestion, isLast = false,
}) {
  const [copied, setCopied] = useState(false);
  const [rated, setRated] = useState(null);
  const [actionsVisible, setActionsVisible] = useState(false);

  const artifactResult = msg.role === "assistant"
    ? extractArtifacts(msg.content)
    : { text: msg.content, artifacts: [] };

  const parsed = msg.role === "assistant"
    ? parseActions(artifactResult.text)
    : { text: msg.content, actions: [] };

  const sources = msg.role === "assistant" ? extractSources(msg.content, msg.toolCalls) : [];
  const suggestions = msg.role === "assistant" && isLast ? contextualSuggestions(msg.content, msg.toolCalls) : [];

  function copyContent() {
    const text = parsed.text || msg.content || "";
    const div = document.createElement("div");
    div.innerHTML = formatContent(text);
    navigator.clipboard.writeText(div.textContent || text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function rate(type) { setRated((prev) => prev === type ? null : type); }

  return (
    <div
      className="flex gap-3 items-start"
      onMouseEnter={() => setActionsVisible(true)}
      onMouseLeave={() => setActionsVisible(false)}
    >
      <div className="w-6 h-6 shrink-0 rounded-full bg-muted flex items-center justify-center text-muted-foreground mt-0.5">
        {msg.role === "user" ? (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.87 3.13-7 7-7s7 3.13 7 7"/>
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        )}
      </div>

      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <span className="text-sm font-semibold text-muted-foreground">{msg.role === "user" ? "You" : "Assistant"}</span>

        {msg.thinking && (
          <ReasoningBlock content={msg.thinking} isDone duration={msg.thinkingDuration} />
        )}

        <div className="msg-content text-sm" dangerouslySetInnerHTML={{ __html: formatContent(parsed.text) }} />

        {artifactResult.artifacts.length > 0 && artifactResult.artifacts.map((artifact, i) => (
          <ArtifactBlock
            key={i}
            title={artifact.title}
            type={artifact.type}
            actions={
              <Button variant="ghost" size="icon-xs" onClick={() => navigator.clipboard.writeText(artifact.content)} title="Copy">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                  <rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3a1.5 1.5 0 011.5-1.5H11"/>
                </svg>
              </Button>
            }
          >
            {artifact.format === "code" ? (
              <div className="rounded-md overflow-hidden border mt-1">
                <div className="flex items-center justify-between px-3 py-1.5 bg-muted text-sm">
                  <span className="text-muted-foreground font-mono">{artifact.lang || ""}</span>
                  <Button variant="ghost" size="xs" className="h-5 px-1.5" onClick={() => navigator.clipboard.writeText(artifact.content)}>Copy</Button>
                </div>
                <pre className="p-3 overflow-x-auto text-sm"><code>{artifact.content}</code></pre>
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: formatContent(artifact.content) }} />
            )}
          </ArtifactBlock>
        ))}

        {msg.role === "assistant" && (
          <div className={`flex items-center gap-0.5 mt-1 transition-opacity duration-150 ${actionsVisible || copied || rated ? "opacity-100" : "opacity-0"}`}>
            <Button variant="ghost" size="icon-xs" onClick={copyContent} title={copied ? "Copied!" : "Copy"}>
              {copied ? (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.5 8.5l3 3 6-6"/></svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3a1.5 1.5 0 011.5-1.5H11"/></svg>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className={rated === "up" ? "text-foreground" : ""}
              onClick={() => rate("up")}
              title="Good response"
            >
              <svg viewBox="0 0 16 16" fill={rated === "up" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                <path d="M5 14V7l3-5 1.5 1-1 4H13a1 1 0 011 1.1l-1 5A1 1 0 0112 14H5zM3 7H2a1 1 0 00-1 1v5a1 1 0 001 1h1"/>
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              className={rated === "down" ? "text-foreground" : ""}
              onClick={() => rate("down")}
              title="Bad response"
            >
              <svg viewBox="0 0 16 16" fill={rated === "down" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                <path d="M11 2v7l-3 5-1.5-1 1-4H3a1 1 0 01-1-1.1l1-5A1 1 0 014 2h7zM13 9h1a1 1 0 001-1V3a1 1 0 00-1-1h-1"/>
              </svg>
            </Button>
            {onRetry && (
              <Button variant="ghost" size="icon-xs" onClick={() => onRetry(msgIdx)} title="Retry">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 8a6 6 0 0110.47-4M14 8a6 6 0 01-10.47 4"/>
                  <path d="M12 1v3h-3M4 15v-3h3"/>
                </svg>
              </Button>
            )}
          </div>
        )}

        <SourcesBlock sources={sources} />

        {parsed.actions.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            {parsed.actions.map((action, actionIdx) => {
              const key = `${msgIdx}-${actionIdx}-${JSON.stringify(action)}`;
              return (
                <AiActionCard
                  key={key}
                  action={action}
                  executing={executingActions[key]}
                  result={executedActions[key]}
                  onExecute={() => onExecuteAction?.(action, `${msgIdx}-${actionIdx}`)}
                />
              );
            })}
          </div>
        )}

        <SuggestionsBar suggestions={suggestions} onSelect={onSuggestion} />
      </div>
    </div>
  );
}

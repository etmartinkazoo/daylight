import { useState, useEffect } from "react";

export default function ReasoningBlock({ content = "", isStreaming = false, isDone = false, duration = 0 }) {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (isDone && content) {
      const t = setTimeout(() => setExpanded(false), 500);
      return () => clearTimeout(t);
    }
  }, [isDone, content]);

  useEffect(() => {
    if (isStreaming && content) setExpanded(true);
  }, [isStreaming, content]);

  return (
    <div className={`reasoning${isStreaming && !isDone ? " streaming" : ""}`}>
      <button className="reasoning-trigger" onClick={() => setExpanded(!expanded)}>
        <div className="reasoning-indicator">
          {isStreaming && !isDone ? (
            <span className="reasoning-pulse" />
          ) : (
            <svg className="reasoning-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1"/>
            </svg>
          )}
        </div>
        <span className="reasoning-label">
          {isStreaming && !isDone ? "Thinking..." : duration ? `Thought for ${duration}s` : "Reasoning"}
        </span>
        <svg className={`reasoning-chevron${expanded ? " open" : ""}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 4.5L6 7.5L9 4.5"/>
        </svg>
      </button>
      <div className={`reasoning-collapse${expanded ? " open" : ""}`}>
        <div className="reasoning-collapse-inner">
          <div className="reasoning-content">
            {content}
            {isStreaming && !isDone && <span className="reasoning-cursor" />}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { typeIcon, typeColor } from "./utils.js";

export default function AiChatInput({
  input = "",
  onInputChange,
  references = [],
  onReferencesChange,
  sending = false,
  chatId = null,
  chatScope = "standard",
  onChatScopeChange,
  onSend,
  onStop,
}) {
  const inputElRef = useRef(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionStartPosRef = useRef(-1);
  const mentionSearchTimerRef = useRef(null);

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
    onInputChange(before + after);
    const exists = references.some((r) => r.type === item.type && r.id === item.id && r.path === item.path);
    if (!exists) onReferencesChange([...references, item]);
    closeMention();
    setTimeout(() => inputElRef.current?.focus(), 10);
  }

  function removeReference(index) {
    onReferencesChange(references.filter((_, i) => i !== index));
    inputElRef.current?.focus();
  }

  function handleKeydown(e) {
    if (mentionOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, mentionResults.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); if (mentionResults[mentionIndex]) selectMention(mentionResults[mentionIndex]); return; }
      if (e.key === "Escape") { e.preventDefault(); closeMention(); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend?.(); }
  }

  function handleInput(e) {
    const el = e.target;
    const val = el.value;
    const pos = el.selectionStart;
    onInputChange(val);

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

  return (
    <>
      {references.length > 0 && (
        <div className="ai-refs">
          {references.map((ref, i) => (
            <span key={i} className="ai-ref-pill" style={{ "--ref-color": typeColor(ref.type) }}>
              <span className="ai-ref-icon">{typeIcon(ref.type)}</span>
              <span className="ai-ref-label">{ref.label}</span>
              <button className="ai-ref-remove" onClick={() => removeReference(i)}>&times;</button>
            </span>
          ))}
        </div>
      )}

      {!chatId && (
        <div className="ai-scope-bar">
          <span className="ai-scope-label">Scope:</span>
          {["focused", "standard", "wide"].map((scope) => (
            <button
              key={scope}
              className={`ai-scope-btn${chatScope === scope ? " active" : ""}`}
              onClick={() => onChatScopeChange?.(scope)}
            >
              {scope.charAt(0).toUpperCase() + scope.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div className="ai-input-wrap">
        {mentionOpen && (
          <div className="mention-popup">
            {mentionLoading && mentionResults.length === 0 ? (
              <div className="mention-loading">Searching...</div>
            ) : mentionResults.length === 0 ? (
              <div className="mention-empty">{mentionQuery ? "No results" : "Type to search..."}</div>
            ) : mentionResults.map((item, i) => (
              <div
                key={i}
                className={`mention-item${i === mentionIndex ? " active" : ""}`}
                onMouseDown={(e) => { e.preventDefault(); selectMention(item); }}
                onMouseEnter={() => setMentionIndex(i)}
              >
                <span className="mention-type-badge" style={{ "--ref-color": typeColor(item.type) }}>{typeIcon(item.type)}</span>
                <div className="mention-item-info">
                  <span className="mention-item-name">{item.label}</span>
                  {item.hint && <span className="mention-item-hint">{item.hint}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="ai-input-area">
          <textarea
            ref={inputElRef}
            value={input}
            onKeyDown={handleKeydown}
            onInput={handleInput}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={references.length > 0 ? "Ask about the referenced items..." : "Ask anything... (@ to mention)"}
            rows={1}
            className="ai-input"
            disabled={sending}
          />
          <button className="ai-send" onClick={onSend} disabled={sending || !input.trim()}>
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

import { useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
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
    <div className="shrink-0 border-t">
      {references.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2">
          {references.map((ref, i) => (
            <Badge key={i} variant="secondary" className="flex items-center gap-1 rounded-full pl-2 pr-1 py-0.5 text-sm font-normal">
              <span className="text-muted-foreground">{typeIcon(ref.type)}</span>
              <span>{ref.label}</span>
              <Button variant="ghost" size="icon-sm" className="h-4 w-4 ml-0.5" onClick={() => removeReference(i)}>
                &times;
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {!chatId && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b">
          <span className="text-sm text-muted-foreground mr-1">Scope:</span>
          <ToggleGroup type="single" value={chatScope} onValueChange={(v) => v && onChatScopeChange?.(v)} className="gap-0.5">
            {["focused", "standard", "wide"].map((scope) => (
              <ToggleGroupItem key={scope} value={scope} className="h-6 px-2 text-sm">
                {scope.charAt(0).toUpperCase() + scope.slice(1)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      <div className="relative px-3 pb-3 pt-2">
        {mentionOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 bg-popover border rounded-md shadow-md z-50 overflow-y-auto max-h-48">
            {mentionLoading && mentionResults.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
            ) : mentionResults.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">{mentionQuery ? "No results" : "Type to search..."}</div>
            ) : mentionResults.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${i === mentionIndex ? "bg-muted" : "hover:bg-muted"}`}
                onMouseDown={(e) => { e.preventDefault(); selectMention(item); }}
                onMouseEnter={() => setMentionIndex(i)}
              >
                <Badge variant="secondary" className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-medium p-0 shrink-0">{typeIcon(item.type)}</Badge>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate text-foreground">{item.label}</span>
                  {item.hint && <span className="text-muted-foreground truncate text-[10px]">{item.hint}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 bg-muted/50 rounded-lg border px-3 py-2">
          <Textarea
            ref={inputElRef}
            value={input}
            onKeyDown={handleKeydown}
            onInput={handleInput}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={references.length > 0 ? "Ask about the referenced items..." : "Ask anything... (@ to mention)"}
            rows={1}
            className="flex-1 resize-none border-0 shadow-none bg-transparent p-0 min-h-5 max-h-32 focus-visible:ring-0"
            disabled={sending}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onSend}
            disabled={sending || !input.trim()}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

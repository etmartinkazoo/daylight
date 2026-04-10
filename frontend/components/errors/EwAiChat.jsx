import { useAiChat } from "@/hooks/useAiChat";
import { usePage } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { markdownToHtml } from "@/lib/markdown.js";

export default function EwAiChat({ context = "", appContext = "" }) {
  const fullContext = [appContext, context].filter(Boolean).join("\n\n");
  const {
    aiModels, selectedModel, setSelectedModel,
    chatId, messages, input, setInput,
    sending, streaming, toolStatus,
    inputRef, sendMessage, newChat, handleKeydown,
  } = useAiChat({ context: fullContext });

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
            <Button variant="ghost" size="xs" onClick={newChat}>+ New</Button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
        {messages.length === 0 && !streaming ? (
          <p className="text-sm text-muted-foreground text-center py-4">Ask a question about this data.</p>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`rounded-lg px-3 py-2 text-sm max-w-[90%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-xs max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />
                ) : msg.content}
              </div>
            </div>
          ))
        )}
        {streaming && (
          <div className="flex flex-col gap-1 items-start">
            <div className="rounded-lg px-3 py-2 text-sm max-w-[90%] bg-muted">
              <div className="prose prose-xs max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: markdownToHtml(streaming) }} />
            </div>
          </div>
        )}
        {toolStatus && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="size-3 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
            {toolStatus}
          </div>
        )}
        {sending && !streaming && !toolStatus && (
          <div className="flex items-start gap-1">
            <div className="bg-muted rounded-lg px-3 py-2 flex gap-1">
              {[0, 150, 300].map((d) => (
                <span key={d} className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-2 flex gap-2 items-end">
        <Textarea
          placeholder="Ask a question..."
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeydown}
          disabled={sending}
          rows={2}
          className="resize-none text-sm"
        />
        <Button size="icon-sm" onClick={sendMessage} disabled={sending || !input.trim()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </Button>
      </div>
    </div>
  );
}

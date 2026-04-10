import { useState, useEffect, useRef } from "react";
import { Form, Link } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { markdownToHtml } from "@/lib/markdown.js";
import { playNotificationSound } from "@/lib/notification-sounds.js";
import { timeAgo, formatTimeLong } from "@/lib/formatters.js";

const severityVariant = { critical: "destructive", warning: "outline", info: "secondary" };
const statusVariant = { draft: "secondary", approved: "default", pushed: "secondary", rejected: "destructive" };
const sourceVariant = { performance: "outline", security: "destructive" };

export default function SolutionShow({
  solution: initialSolution = {}, messages: initialMessages = [], source_issue = null,
  github_configured = false, base_path: base = "/daylight", aiModels = [], defaultAiModel = "",
}) {
  const [solution, setSolution] = useState(initialSolution);
  const [selectedModel, setSelectedModel] = useState(defaultAiModel || "");
  const [chatMessages, setChatMessages] = useState(initialMessages);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!selectedModel && defaultAiModel) setSelectedModel(defaultAiModel);
  }, [defaultAiModel]);

  useEffect(() => {
    if (messagesRef.current) {
      requestAnimationFrame(() => { messagesRef.current.scrollTop = messagesRef.current.scrollHeight; });
    }
  }, [chatMessages]);

  const proposedFixHtml = markdownToHtml(solution.proposed_fix);

  const solutionUrl = `${base}/solutions/${solution.id}`;

  async function sendChat() {
    if (!chatInput.trim() || sending) return;
    const message = chatInput.trim();
    setChatInput("");
    setSending(true);
    setChatMessages((prev) => [...prev, { id: Date.now(), role: "user", content: message, created_at: new Date().toISOString() }]);
    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.content;
      const res = await fetch(`${base}/solutions/${solution.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify({ message, model: selectedModel || undefined }),
      });
      const data = await res.json();
      if (data.message) {
        setChatMessages((prev) => [...prev, { id: data.message.id || Date.now() + 1, role: "assistant", content: data.message.content, created_at: data.message.created_at || new Date().toISOString() }]);
        playNotificationSound();
      }
      if (data.proposed_fix) setSolution((prev) => ({ ...prev, proposed_fix: data.proposed_fix }));
    } catch {
      setChatMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", content: "Sorry, something went wrong. Please try again.", created_at: new Date().toISOString() }]);
    } finally {
      setSending(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }

  function handleKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">
        <Button variant="ghost" size="sm" className="w-fit -ml-1" asChild>
          <Link href={`${base}/solutions`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            All Solutions
          </Link>
        </Button>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">{solution.title}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {solution.severity && <Badge variant={severityVariant[solution.severity] || "secondary"}>{solution.severity}</Badge>}
            {solution.source_type && <Badge variant={sourceVariant[solution.source_type?.toLowerCase()] || "secondary"}>{solution.source_type}</Badge>}
            <Badge variant={statusVariant[solution.status] || "secondary"}>{solution.status}</Badge>
            <span className="text-sm text-muted-foreground">Generated {timeAgo(solution.generated_at)} &middot; {formatTimeLong(solution.generated_at)}</span>
          </div>
          {solution.approved_at && <span className="text-sm text-muted-foreground">Approved {formatTimeLong(solution.approved_at)}</span>}
          {solution.pushed_at && <span className="text-sm text-muted-foreground">Pushed {formatTimeLong(solution.pushed_at)}</span>}
        </div>

        <div className="grid grid-cols-[1fr_360px] gap-5 items-start">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader className="border-b py-3">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  Problem
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-sm">{solution.problem_description}</CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b py-3">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Proposed Fix
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: proposedFixHtml }} />
              </CardContent>
            </Card>

            {source_issue && (
              <Card>
                <CardHeader className="border-b py-3"><CardTitle className="text-sm">Source Issue</CardTitle></CardHeader>
                <CardContent className="pt-4 flex flex-col gap-2">
                  {source_issue.title && <p className="text-sm font-medium">{source_issue.title}</p>}
                  {source_issue.description && <p className="text-sm text-muted-foreground">{source_issue.description}</p>}
                  {source_issue.url && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={source_issue.url} target="_blank" rel="noopener noreferrer">
                        View Source Issue
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {solution.file_paths?.length > 0 && (
              <Card>
                <CardHeader className="border-b py-3"><CardTitle className="text-sm">Files Changed</CardTitle></CardHeader>
                <CardContent className="pt-4 flex flex-col gap-1">
                  {solution.file_paths.map((fp, i) => (
                    <code key={i} className="text-sm font-mono bg-muted/50 px-2 py-1 rounded">{fp}</code>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Chat panel */}
          <Card className="sticky top-4 flex flex-col" style={{ maxHeight: "calc(100vh - 6rem)" }}>
            <CardHeader className="border-b py-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Chat
                {solution.message_count > 0 && <Badge variant="secondary" className="h-4 px-1 text-sm">{solution.message_count}</Badge>}
              </CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0" ref={messagesRef}>
              {chatMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Ask questions or request changes to this solution.</p>
              ) : chatMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`rounded-lg px-3 py-2 text-sm max-w-[90%] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-xs max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: markdownToHtml(msg.content) }} />
                    ) : msg.content}
                  </div>
                  <span className="text-sm text-muted-foreground">{timeAgo(msg.created_at)}</span>
                </div>
              ))}
              {sending && (
                <div className="flex items-start gap-1">
                  <div className="bg-muted rounded-lg px-3 py-2 flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="size-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            {aiModels.length > 1 && (
              <div className="border-t px-3 py-2">
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger size="sm" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aiModels.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="border-t p-2 flex gap-2 items-end">
              <Textarea
                placeholder="Ask about this solution..."
                ref={textareaRef}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeydown}
                disabled={sending}
                rows={2}
                className="resize-none text-sm"
              />
              <Button size="icon-sm" onClick={sendChat} disabled={sending || !chatInput.trim()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {solution.status === "draft" && (
            <>
              <Form method="patch" action={solutionUrl} data={{ status: "approved" }} className="inline">
                {() => (
                  <Button type="submit">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Approve
                  </Button>
                )}
              </Form>
              <Form method="patch" action={solutionUrl} data={{ status: "rejected" }} className="inline">
                {() => <Button type="submit" variant="destructive">Reject</Button>}
              </Form>
            </>
          )}
          <Form method="patch" action={`${solutionUrl}/generation`} className="inline">
            {() => (
              <Button type="submit" variant="outline">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
                Regenerate
              </Button>
            )}
          </Form>
          {solution.status === "approved" && github_configured && (
            <Form method="post" action={`${solutionUrl}/push`} className="inline">
              {() => (
                <Button type="submit">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
                  Push to GitHub
                </Button>
              )}
            </Form>
          )}
          {solution.status === "pushed" && solution.pr_url && (
            <Button variant="outline" asChild>
              <a href={solution.pr_url} target="_blank" rel="noopener noreferrer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                View Pull Request
                {solution.pr_branch && <code className="text-sm font-mono ml-1">{solution.pr_branch}</code>}
              </a>
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

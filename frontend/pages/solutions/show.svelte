<script>
  import { router, usePage } from "@inertiajs/svelte";
  import DaylightLayout from "../DaylightLayout.svelte";
  import Button from "@/components/ui/Button.svelte";
  import { markdownToHtml } from "@/lib/markdown.js";
  import { playNotificationSound } from "@/lib/notification-sounds.js";

  let { solution = {}, messages: initialMessages = [], source_issue = null, github_configured = false } = $props();
  const pageStore = usePage();
  let base = $derived($pageStore.props?.base_path || "/daylight");

  let aiModels = $derived($pageStore.props?.aiModels || []);
  let defaultAiModel = $derived($pageStore.props?.defaultAiModel || "");
  let selectedModel = $state("");

  $effect(() => {
    if (!selectedModel && defaultAiModel) selectedModel = defaultAiModel;
  });

  let chatMessages = $state(initialMessages);
  let chatInput = $state("");
  let sending = $state(false);
  let proposedFixHtml = $derived(markdownToHtml(solution.proposed_fix));
  let messagesContainer = $state(null);
  let chatTextarea = $state(null);

  function scrollToBottom() {
    if (messagesContainer) {
      requestAnimationFrame(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      });
    }
  }

  $effect(() => {
    if (chatMessages.length) scrollToBottom();
  });

  function timeAgo(dateStr) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`;
  }

  function formatTime(dateStr) {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  const severityColors = {
    critical: "var(--color-danger)",
    warning: "var(--color-warning)",
    info: "var(--color-info)",
    low: "var(--color-muted)",
  };

  const statusBadgeStyles = {
    draft: { bg: "var(--color-accent)", color: "var(--color-muted)" },
    approved: { bg: "var(--color-success-subtle)", color: "var(--color-success-dark)" },
    pushed: { bg: "var(--color-info-subtle, var(--color-accent))", color: "var(--color-info)" },
    rejected: { bg: "var(--color-danger-subtle)", color: "var(--color-danger-hover)" },
  };

  const sourceTypeBadgeStyles = {
    incident: { bg: "var(--color-warning-subtle, var(--color-accent))", color: "var(--color-warning-dark, var(--color-warning))" },
    error: { bg: "var(--color-danger-subtle)", color: "var(--color-danger-hover)" },
    manual: { bg: "var(--color-accent)", color: "var(--color-muted)" },
  };

  let sevColor = $derived(severityColors[solution.severity] || "var(--color-muted)");
  let statusStyle = $derived(statusBadgeStyles[solution.status] || { bg: "var(--color-accent)", color: "var(--color-muted)" });
  let sourceStyle = $derived(sourceTypeBadgeStyles[solution.source_type] || { bg: "var(--color-accent)", color: "var(--color-muted)" });

  function updateStatus(newStatus) {
    router.patch(`${base}/solutions/${solution.id}`, { status: newStatus });
  }

  function regenerate() {
    router.post(`${base}/solutions/${solution.id}/regenerate`);
  }

  function pushToGithub() {
    router.post(`${base}/solutions/${solution.id}/push`);
  }

  async function sendChat() {
    if (!chatInput.trim() || sending) return;
    const message = chatInput.trim();
    chatInput = "";
    sending = true;

    const userMsg = { id: Date.now(), role: "user", content: message, created_at: new Date().toISOString() };
    chatMessages = [...chatMessages, userMsg];

    try {
      const token = document.querySelector('meta[name="csrf-token"]')?.content;
      const res = await fetch(`${base}/solutions/${solution.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
        body: JSON.stringify({ message, model: selectedModel || undefined }),
      });
      const data = await res.json();

      if (data.message) {
        chatMessages = [...chatMessages, {
          id: data.message.id || Date.now() + 1,
          role: "assistant",
          content: data.message.content,
          created_at: data.message.created_at || new Date().toISOString(),
        }];
        playNotificationSound();
      }

      if (data.proposed_fix) {
        solution.proposed_fix = data.proposed_fix;
      }
    } catch (err) {
      chatMessages = [...chatMessages, {
        id: Date.now() + 1,
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        created_at: new Date().toISOString(),
      }];
    } finally {
      sending = false;
      requestAnimationFrame(() => chatTextarea?.focus());
    }
  }

  function handleKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  }
</script>

<svelte:head><title>{solution.title || "Solution"} — Daylight</title></svelte:head>

<DaylightLayout>
  <div class="solution-show">
    <!-- Back link -->
    <a href={`${base}/solutions`} class="back-link">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
      All Solutions
    </a>

    <!-- Header -->
    <div class="header">
      <h1 class="title">{solution.title}</h1>
      <div class="header-meta">
        {#if solution.severity}
          <span class="severity-badge" style="background: {sevColor}15; color: {sevColor}; border: 1px solid {sevColor}30">
            {solution.severity}
          </span>
        {/if}
        {#if solution.source_type}
          <span class="source-badge" style="background: {sourceStyle.bg}; color: {sourceStyle.color}">
            {solution.source_type}
          </span>
        {/if}
        <span class="status-badge" style="background: {statusStyle.bg}; color: {statusStyle.color}">
          {solution.status}
        </span>
        <span class="header-time">
          Generated {timeAgo(solution.generated_at)}
          <span class="header-time-abs">{formatTime(solution.generated_at)}</span>
        </span>
      </div>
      {#if solution.approved_at}
        <div class="header-timestamp">Approved {formatTime(solution.approved_at)}</div>
      {/if}
      {#if solution.pushed_at}
        <div class="header-timestamp">Pushed {formatTime(solution.pushed_at)}</div>
      {/if}
    </div>

    <!-- Two-panel layout -->
    <div class="panels">
      <!-- Main panel -->
      <div class="main-panel">
        <!-- Problem -->
        <div class="card">
          <h2 class="card-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Problem
          </h2>
          <div class="problem-text">{solution.problem_description}</div>
        </div>

        <!-- Proposed Fix -->
        <div class="card">
          <h2 class="card-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            Proposed Fix
          </h2>
          <div class="fix-content msg-content">
            {@html proposedFixHtml}
          </div>
        </div>

        <!-- Source Issue -->
        {#if source_issue}
          <div class="card">
            <h2 class="card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Source Issue
            </h2>
            {#if source_issue.title}
              <div class="source-issue-title">{source_issue.title}</div>
            {/if}
            {#if source_issue.description}
              <div class="source-issue-desc">{source_issue.description}</div>
            {/if}
            {#if source_issue.url}
              <a href={source_issue.url} target="_blank" rel="noopener noreferrer" class="card-link">
                View Source Issue
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            {/if}
          </div>
        {/if}

        <!-- File Paths -->
        {#if solution.file_paths?.length}
          <div class="card">
            <h2 class="card-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
              Files Changed
            </h2>
            <div class="file-paths">
              {#each solution.file_paths as filePath}
                <code class="file-path">{filePath}</code>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Chat panel -->
      <div class="chat-panel">
        <div class="chat-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Chat
          {#if solution.message_count}
            <span class="chat-count">{solution.message_count}</span>
          {/if}
        </div>

        <div class="chat-messages" bind:this={messagesContainer}>
          {#if chatMessages.length === 0}
            <div class="chat-empty">
              <span>Ask questions or request changes to this solution.</span>
            </div>
          {:else}
            {#each chatMessages as msg}
              <div class="chat-msg chat-msg-{msg.role}">
                <div class="chat-bubble chat-bubble-{msg.role}">
                  {#if msg.role === "assistant"}
                    <div class="chat-bubble-content msg-content">{@html markdownToHtml(msg.content)}</div>
                  {:else}
                    <div class="chat-bubble-content">{msg.content}</div>
                  {/if}
                </div>
                <div class="chat-time">{timeAgo(msg.created_at)}</div>
              </div>
            {/each}
          {/if}
          {#if sending}
            <div class="chat-msg chat-msg-assistant">
              <div class="chat-bubble chat-bubble-assistant">
                <div class="chat-typing">
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                  <span class="typing-dot"></span>
                </div>
              </div>
            </div>
          {/if}
        </div>

        {#if aiModels.length > 1}
          <div class="chat-model-bar">
            <select class="chat-model-select" bind:value={selectedModel}>
              {#each aiModels as m (m.value)}
                <option value={m.value}>{m.label}</option>
              {/each}
            </select>
          </div>
        {/if}
        <div class="chat-input-area">
          <textarea
            class="chat-textarea"
            placeholder="Ask about this solution..."
            bind:this={chatTextarea}
            bind:value={chatInput}
            onkeydown={handleKeydown}
            disabled={sending}
            rows="2"
          ></textarea>
          <button class="chat-send-btn" onclick={sendChat} disabled={sending || !chatInput.trim()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Action bar -->
    <div class="action-bar">
      {#if solution.status === "draft"}
        <Button variant="primary" onclick={() => updateStatus("approved")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Approve
        </Button>
        <Button variant="danger" onclick={() => updateStatus("rejected")}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Reject
        </Button>
      {/if}

      <Button variant="outline" onclick={regenerate}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
        Regenerate
      </Button>

      {#if solution.status === "approved" && github_configured}
        <Button variant="primary" onclick={pushToGithub}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>
          Push to GitHub
        </Button>
      {/if}

      {#if solution.status === "pushed" && solution.pr_url}
        <a href={solution.pr_url} target="_blank" rel="noopener noreferrer" class="pr-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          View Pull Request
          {#if solution.pr_branch}
            <span class="pr-branch">{solution.pr_branch}</span>
          {/if}
        </a>
      {/if}
    </div>
  </div>
</DaylightLayout>

<style>
  .solution-show { display: flex; flex-direction: column; gap: 1.25rem; }

  /* Back link */
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-muted);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .back-link:hover { color: var(--color-fg); }

  /* Header */
  .header { display: flex; flex-direction: column; gap: 0.75rem; }
  .title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-fg);
    margin: 0;
    letter-spacing: -0.02em;
    line-height: 1.3;
  }
  .header-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .header-timestamp {
    font-size: 0.75rem;
    color: var(--color-muted-light);
  }

  .severity-badge {
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.1875rem 0.5rem;
    border-radius: 9999px;
  }
  .source-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.1875rem 0.5rem;
    border-radius: 9999px;
  }
  .status-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.1875rem 0.5rem;
    border-radius: 9999px;
    text-transform: capitalize;
  }
  .header-time {
    font-size: 0.8125rem;
    color: var(--color-muted);
    margin-left: auto;
  }
  .header-time-abs {
    color: var(--color-muted-light);
    font-size: 0.75rem;
    margin-left: 0.25rem;
  }

  /* Two-panel layout */
  .panels {
    display: flex;
    gap: 0;
    min-height: 500px;
  }
  .main-panel {
    flex: 0 0 65%;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-right: 1.25rem;
  }
  .chat-panel {
    flex: 0 0 35%;
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--color-border);
    padding-left: 1.25rem;
    min-height: 500px;
    max-height: 80vh;
  }

  /* Cards */
  .card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .card-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-fg);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .problem-text {
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--color-fg-secondary);
  }

  /* Fix content - markdown styles */
  .fix-content {
    font-size: 0.875rem;
    line-height: 1.7;
    color: var(--color-fg-secondary);
  }
  .fix-content :global(h1),
  .fix-content :global(.md-h1) { font-size: 1.25rem; font-weight: 700; color: var(--color-fg); margin: 1.5rem 0 0.75rem; }
  .fix-content :global(h2),
  .fix-content :global(.md-h2) { font-size: 1.125rem; font-weight: 650; color: var(--color-fg); margin: 1.25rem 0 0.5rem; }
  .fix-content :global(h3),
  .fix-content :global(.md-h3) { font-size: 1rem; font-weight: 600; color: var(--color-fg); margin: 1rem 0 0.5rem; }
  .fix-content :global(p),
  .fix-content :global(.md-p) { margin: 0.5rem 0; }
  .fix-content :global(ul),
  .fix-content :global(.md-ul) { padding-left: 1.25rem; margin: 0.5rem 0; }
  .fix-content :global(ol),
  .fix-content :global(.md-ol) { padding-left: 1.25rem; margin: 0.5rem 0; }
  .fix-content :global(li),
  .fix-content :global(.md-li) { margin: 0.25rem 0; }
  .fix-content :global(code),
  .fix-content :global(.md-code) {
    font-family: "SF Mono", Monaco, Menlo, monospace;
    font-size: 0.8125em;
    background: var(--color-accent);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    color: var(--color-rose, var(--color-danger));
  }
  .fix-content :global(.code-block) {
    margin: 0.75rem 0;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    overflow: hidden;
  }
  .fix-content :global(.code-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.375rem 0.75rem;
    background: var(--color-accent);
    border-bottom: 1px solid var(--color-border);
    font-size: 0.6875rem;
    color: var(--color-muted);
  }
  .fix-content :global(.code-copy) {
    font-size: 0.625rem;
    font-weight: 600;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-muted);
    cursor: pointer;
  }
  .fix-content :global(.md-pre) {
    margin: 0;
    padding: 0.75rem;
    background: var(--color-surface);
    font-family: "SF Mono", Monaco, Menlo, monospace;
    font-size: 0.75rem;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .fix-content :global(strong) { font-weight: 650; color: var(--color-fg); }
  .fix-content :global(a),
  .fix-content :global(.md-link) { color: var(--color-info); text-decoration: none; }
  .fix-content :global(a:hover),
  .fix-content :global(.md-link:hover) { text-decoration: underline; }

  /* Source issue */
  .source-issue-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-fg);
  }
  .source-issue-desc {
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--color-fg-secondary);
  }
  .card-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-info);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .card-link:hover { text-decoration: underline; }

  /* File paths */
  .file-paths {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .file-path {
    font-family: "SF Mono", Monaco, Menlo, monospace;
    font-size: 0.75rem;
    background: var(--color-accent);
    color: var(--color-fg-secondary);
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid var(--color-border);
  }

  /* Chat panel */
  .chat-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-fg);
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .chat-count {
    font-size: 0.6875rem;
    font-weight: 600;
    background: var(--color-accent);
    color: var(--color-muted);
    padding: 0.0625rem 0.375rem;
    border-radius: 9999px;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .chat-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 0.8125rem;
    color: var(--color-muted-light);
    text-align: center;
    padding: 2rem;
  }

  .chat-msg {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .chat-msg-user { align-items: flex-end; }
  .chat-msg-assistant { align-items: flex-start; }

  .chat-bubble {
    max-width: 90%;
    padding: 0.5rem 0.75rem;
    border-radius: 0.75rem;
    font-size: 0.8125rem;
    line-height: 1.5;
    word-break: break-word;
  }
  .chat-bubble-user {
    background: var(--color-primary);
    color: var(--color-primary-fg, var(--color-bg));
    border-bottom-right-radius: 0.25rem;
  }
  .chat-bubble-assistant {
    background: var(--color-surface);
    color: var(--color-fg);
    border: 1px solid var(--color-border);
    border-bottom-left-radius: 0.25rem;
  }
  .chat-bubble-content :global(p) { margin: 0.25rem 0; }
  .chat-bubble-content :global(p:first-child) { margin-top: 0; }
  .chat-bubble-content :global(p:last-child) { margin-bottom: 0; }
  .chat-bubble-content :global(code) {
    font-family: "SF Mono", Monaco, Menlo, monospace;
    font-size: 0.75em;
    background: var(--color-accent);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
  }
  .chat-bubble-content :global(pre) {
    margin: 0.375rem 0;
    padding: 0.5rem;
    background: var(--color-accent);
    border-radius: 0.375rem;
    font-family: "SF Mono", Monaco, Menlo, monospace;
    font-size: 0.75rem;
    overflow-x: auto;
    white-space: pre-wrap;
  }

  .chat-time {
    font-size: 0.625rem;
    color: var(--color-muted-light);
    padding: 0 0.25rem;
  }

  /* Typing indicator */
  .chat-typing {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem 0;
  }
  .typing-dot {
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 50%;
    background: var(--color-muted);
    animation: typing-bounce 1.4s ease-in-out infinite;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typing-bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40% { transform: translateY(-4px); opacity: 1; }
  }

  /* Chat input */
  .chat-model-bar {
    padding: 0.375rem 0.75rem;
    border-top: 1px solid var(--color-accent);
  }

  .chat-model-select {
    width: 100%;
    padding: 0.3125rem 0.5rem;
    font-size: 0.75rem;
    font-family: inherit;
    border: 1px solid var(--color-border);
    border-radius: 0.375rem;
    background: var(--color-bg);
    color: var(--color-muted);
    outline: none;
  }

  .chat-model-select:focus {
    border-color: var(--color-primary);
  }

  .chat-input-area {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }
  .chat-textarea {
    flex: 1;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    font-family: inherit;
    line-height: 1.4;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    color: var(--color-fg);
    resize: none;
    outline: none;
    transition: border-color 0.15s ease;
  }
  .chat-textarea:focus {
    border-color: var(--color-primary);
  }
  .chat-textarea::placeholder {
    color: var(--color-muted-light);
  }
  .chat-textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .chat-send-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: none;
    border-radius: 0.5rem;
    background: var(--color-primary);
    color: var(--color-primary-fg, var(--color-bg));
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.15s ease;
  }
  .chat-send-btn:hover:not(:disabled) {
    opacity: 0.85;
  }
  .chat-send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Action bar */
  .action-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
    flex-wrap: wrap;
  }

  .pr-link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--color-info);
    text-decoration: none;
    padding: 0.5rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-bg);
    transition: all 0.15s ease;
  }
  .pr-link:hover {
    background: var(--color-surface);
    text-decoration: none;
  }
  .pr-branch {
    font-family: "SF Mono", Monaco, Menlo, monospace;
    font-size: 0.6875rem;
    background: var(--color-accent);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    color: var(--color-muted);
  }

  /* Responsive */
  @media (max-width: 900px) {
    .panels {
      flex-direction: column;
    }
    .main-panel {
      flex: 1;
      padding-right: 0;
      padding-bottom: 1.25rem;
    }
    .chat-panel {
      flex: 1;
      border-left: none;
      border-top: 1px solid var(--color-border);
      padding-left: 0;
      padding-top: 1.25rem;
      max-height: 60vh;
    }
    .header-time { margin-left: 0; }
    .action-bar { flex-wrap: wrap; }
  }
</style>

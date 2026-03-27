<script>
  import { usePage } from "@inertiajs/svelte";
  import Sheet from "@/components/ui/Sheet.svelte";
  import EwAiChat from "./EwAiChat.svelte";

  let { open = $bindable(false), error = null, onstatuschange } = $props();

  const pageStore = usePage();
  let base = $derived(pageStore.props?.base_path || "/daylight");
  let ewSettings = $derived(pageStore.props.ew_settings || {});

  let tab = $state("info");
  let aiChatRef;

  let appContextStr = $derived.by(() => {
    const parts = [];
    if (ewSettings.ai_context_notes) parts.push(ewSettings.ai_context_notes);
    if (ewSettings.github_repo_url)
      parts.push(`GitHub repo: ${ewSettings.github_repo_url} (branch: ${ewSettings.github_default_branch || "main"})`);
    return parts.join("\n");
  });

  function switchToAi() {
    tab = "ai";
    aiChatRef?.focus();
  }

  $effect(() => {
    if (open) tab = "info";
  });

  $effect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (open) {
          if (tab === "ai") open = false;
          else switchToAi();
        } else {
          open = true;
          setTimeout(() => switchToAi(), 0);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function action(newStatus) {
    onstatuschange?.(error.id, newStatus);
    open = false;
  }
</script>

<Sheet bind:open title={error?.error_class || "Error"}>
  {#if error}
    <nav>
      <button class:active={tab === "info"} onclick={() => (tab = "info")}>Info</button>
      <button class:active={tab === "ai"} onclick={switchToAi}>AI</button>
    </nav>

    {#if tab === "ai"}
      <div class="ai-body">
        <EwAiChat bind:this={aiChatRef} context={error.ai_context || ""} appContext={appContextStr} />
      </div>
    {:else}
      <div class="detail">
        <div class="status-row">
          <span class="status" data-status={error.status}>{error.status}</span>
          <span class="count">
            {error.occurrences_count} occurrence{error.occurrences_count === 1 ? "" : "s"}
          </span>
        </div>

        <h4>Message</h4>
        <p class="message">{error.message}</p>

        {#if error.recent_occurrences?.length > 0}
          {@const lastOcc = error.recent_occurrences[0]}
          {#if lastOcc.request_url || lastOcc.context?.route || lastOcc.context?.controller_action}
            <h4>Where</h4>
            <dl class="where">
              {#if lastOcc.request_method && lastOcc.request_url}
                <div><dt>URL</dt><dd class="mono">{lastOcc.request_method} {lastOcc.request_url}</dd></div>
              {/if}
              {#if lastOcc.context?.route}
                <div><dt>Route</dt><dd>{lastOcc.context.route}</dd></div>
              {/if}
              {#if lastOcc.context?.controller_action}
                <div><dt>Controller</dt><dd>{lastOcc.context.controller_action}</dd></div>
              {/if}
              {#if lastOcc.context?.tenant}
                <div><dt>Tenant</dt><dd>{lastOcc.context.tenant}</dd></div>
              {/if}
              {#if lastOcc.context?.user_name}
                <div><dt>User</dt><dd>{lastOcc.context.user_name} (#{lastOcc.context.user_id})</dd></div>
              {/if}
            </dl>
          {/if}
        {/if}

        <dl class="meta">
          <div><dt>First seen</dt><dd>{error.first_seen_at}</dd></div>
          <div><dt>Last seen</dt><dd>{error.last_seen_at}</dd></div>
          <div><dt>Severity</dt><dd>{error.severity}</dd></div>
        </dl>

        {#if error.backtrace_summary}
          <h4>Backtrace</h4>
          <pre>{error.backtrace_summary}</pre>
        {/if}

        {#if error.recent_occurrences?.length > 1}
          <h4>Recent Occurrences</h4>
          <ul class="occ-list">
            {#each error.recent_occurrences as occ (occ.id)}
              <li>
                <span class="occ-time">{occ.occurred_at}</span>
                {#if occ.request_url}
                  <span class="occ-url">{occ.request_method} {occ.request_url}</span>
                {/if}
                {#if occ.context?.route}
                  <span class="occ-route">{occ.context.route}</span>
                {/if}
                {#if occ.context?.user_name}
                  <span class="occ-user">{occ.context.user_name}</span>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}

        <footer>
          {#if error.status === "open"}
            <button onclick={() => action("resolved")}>Resolve</button>
            <button onclick={() => action("ignored")}>Ignore</button>
          {:else}
            <button onclick={() => action("open")}>Reopen</button>
          {/if}
          <a href={`${base}/errors/${error.id}`}>View full detail &rarr;</a>
        </footer>
      </div>
    {/if}
  {/if}
</Sheet>

<style>
  nav {
    display: flex;
    border-bottom: 1px solid var(--color-border);
    margin: -1.5rem -1.5rem 0;
    padding: 0 1.5rem;

    button {
      flex: 1;
      padding: 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      font-family: inherit;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border: none;
      background: none;
      color: var(--color-muted);
      cursor: pointer;
      text-align: center;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: all 0.15s ease;

      &:hover { color: var(--color-fg); }
      &.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
    }
  }

  .ai-body {
    margin: 0 -1.5rem -1.5rem;
    flex: 1;
    overflow: hidden;
  }

  .detail {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    h4 {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-muted-light);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0;
    }
  }

  .status-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .status {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: capitalize;
    letter-spacing: 0.01em;
    padding: 0.1875rem 0.5rem;
    border-radius: 999px;

    &[data-status="open"] { background: var(--color-danger-subtle); color: var(--color-danger-hover); }
    &[data-status="resolved"] { background: var(--color-success-subtle); color: var(--color-success-dark); }
    &[data-status="ignored"] { background: var(--color-accent); color: var(--color-muted-light); }
  }

  .count {
    font-size: 0.8125rem;
    color: var(--color-muted);
  }

  .message {
    font-size: 0.875rem;
    color: var(--color-fg-secondary);
    margin: 0;
    word-break: break-word;
    line-height: 1.5;
  }

  .where {
    margin: 0;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    overflow: hidden;

    div {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.625rem;
      border-bottom: 1px solid var(--color-accent);

      &:last-child { border-bottom: none; }
    }

    dt {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--color-muted-light);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      width: 5rem;
      flex-shrink: 0;
    }

    dd {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--color-fg-secondary);
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .mono {
    font-family: "SF Mono", Monaco, Menlo, monospace;
    font-size: 0.75rem;
  }

  .meta {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;

    div {
      display: flex;
      justify-content: space-between;
      font-size: 0.8125rem;
    }

    dt { color: var(--color-muted); }
    dd { margin: 0; }
  }

  pre {
    font-size: 0.6875rem;
    font-family: "SF Mono", Monaco, Menlo, monospace;
    background: var(--color-surface);
    padding: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    line-height: 1.7;
  }

  .occ-list {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    overflow: hidden;

    li {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.375rem 0.625rem;
      border-bottom: 1px solid var(--color-accent);
      font-size: 0.75rem;

      &:last-child { border-bottom: none; }
    }
  }

  .occ-time { color: var(--color-muted); font-weight: 500; flex-shrink: 0; }
  .occ-url { color: var(--color-fg-tertiary); font-family: monospace; font-size: 0.6875rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .occ-route { color: var(--color-fg); font-weight: 500; }
  .occ-user { color: var(--color-muted-light); margin-left: auto; flex-shrink: 0; }

  footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);

    button {
      padding: 0.4375rem 0.875rem;
      font-size: 0.8125rem;
      font-weight: 500;
      font-family: inherit;
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      background: var(--color-bg);
      color: var(--color-fg-tertiary);
      cursor: pointer;
      transition: background-color 0.1s;

      &:hover { background: var(--color-surface); }
    }

    a {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-fg);
      text-decoration: none;
      margin-left: auto;

      &:hover { text-decoration: underline; }
    }
  }
</style>

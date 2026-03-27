<script>
  import Button from "@/components/ui/Button.svelte";
  import { timeAgo } from "@/lib/formatters.js";

  let { issue, expanded = false, ontoggle, ondismiss, variant = "performance", typeLabel = "", typeClass = "" } = $props();
</script>

<div class="issue-card {issue.severity === 'critical' ? 'issue-critical' : issue.severity === 'warning' ? 'issue-warning' : issue.severity === 'info' ? 'issue-info' : ''}">
  <button class="issue-summary" onclick={() => ontoggle(issue.id)}>
    <div class="issue-left">
      {#if variant === "performance"}
        <span class="issue-type-badge {typeClass}">{typeLabel}</span>
      {:else}
        <span class="sec-type-badge {typeClass}">{typeLabel}</span>
      {/if}
      <span class="issue-severity-dot {issue.severity}"></span>
      <span class="issue-title">{issue.title}</span>
    </div>
    <div class="issue-right">
      {#if variant === "performance"}
        {#if issue.total_time_ms}
          <span class="issue-stat">{issue.total_time_ms >= 1000 ? `${(issue.total_time_ms / 1000).toFixed(1)}s` : `${Math.round(issue.total_time_ms)}ms`} total</span>
        {/if}
        <span class="issue-stat">{issue.occurrences}x</span>
      {:else}
        {#if issue.confidence}
          <span class="sec-confidence sec-conf-{issue.confidence}">{issue.confidence}</span>
        {/if}
      {/if}
      <svg class="issue-chevron" class:expanded width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  </button>

  {#if expanded}
    <div class="issue-detail">
      <p class="issue-desc">{issue.description}</p>

      <div class="issue-meta-grid">
        {#if variant === "performance"}
          {#if issue.source_location}
            <div class="issue-meta-item">
              <span class="issue-meta-label">Source</span>
              <code class="issue-meta-code">{issue.source_location}</code>
            </div>
          {/if}
          {#if issue.controller_action}
            <div class="issue-meta-item">
              <span class="issue-meta-label">Controller</span>
              <code class="issue-meta-code">{issue.controller_action}</code>
            </div>
          {/if}
          {#if issue.avg_duration_ms}
            <div class="issue-meta-item">
              <span class="issue-meta-label">Avg Duration</span>
              <span>{issue.avg_duration_ms.toFixed(1)}ms</span>
            </div>
          {/if}
        {:else}
          {#if issue.file_path}
            <div class="issue-meta-item">
              <span class="issue-meta-label">File</span>
              <code class="issue-meta-code">{issue.file_path}{#if issue.line_number}:{issue.line_number}{/if}</code>
            </div>
          {/if}
          {#if issue.warning_type}
            <div class="issue-meta-item">
              <span class="issue-meta-label">Warning Type</span>
              <span>{issue.warning_type}</span>
            </div>
          {/if}
          {#if issue.check_name}
            <div class="issue-meta-item">
              <span class="issue-meta-label">Check</span>
              <span>{issue.check_name}</span>
            </div>
          {/if}
        {/if}
        {#if issue.detected_at}
          <div class="issue-meta-item">
            <span class="issue-meta-label">Detected</span>
            <span>{timeAgo(issue.detected_at)}</span>
          </div>
        {/if}
      </div>

      {#if variant === "performance" && issue.sql_pattern}
        <div class="issue-sql">
          <span class="issue-sql-label">SQL Pattern</span>
          <pre class="issue-sql-pre">{issue.sql_pattern}</pre>
        </div>
      {/if}

      {#if variant === "security" && issue.code_snippet}
        <div class="issue-sql">
          <span class="issue-sql-label">Vulnerable Code</span>
          <pre class="issue-sql-pre">{issue.code_snippet}</pre>
        </div>
      {/if}

      {#if issue.solution}
        <div class="issue-solution {variant === 'security' ? 'sec-solution' : ''}">
          <span class="issue-solution-label">
            {#if variant === "performance"}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              AI Suggestion
            {:else}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              AI Fix Suggestion
            {/if}
          </span>
          <div class="issue-solution-body">{@html issue.solution.replace(/\n/g, '<br>')}</div>
        </div>
      {/if}

      <div class="issue-actions">
        {#if variant === "security" && issue.link}
          <a href={issue.link} target="_blank" rel="noopener" class="sec-ref-link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Brakeman docs
          </a>
        {/if}
        <Button variant="outline" size="sm" onclick={() => ondismiss(issue.id, "fixed")}>Mark Fixed</Button>
        <Button variant="ghost" size="sm" onclick={() => ondismiss(issue.id, "ignored")}>Ignore</Button>
      </div>
    </div>
  {/if}
</div>

<style>
  .issue-card {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    overflow: hidden;
    transition: border-color 0.15s;
  }

  .issue-card.issue-critical { border-left: 3px solid var(--color-danger); }
  .issue-card.issue-warning { border-left: 3px solid var(--color-warning); }
  .issue-card.issue-info { border-left: 3px solid var(--color-info); }

  .issue-summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    background: none;
    font-family: inherit;
    cursor: pointer;
    gap: 1rem;
    text-align: left;
    transition: background 0.1s;
  }

  .issue-summary:hover {
    background: var(--color-surface);
  }

  .issue-left {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    min-width: 0;
    flex: 1;
  }

  .issue-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .issue-title {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-fg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .issue-stat {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-muted);
    font-variant-numeric: tabular-nums;
  }

  .issue-chevron {
    color: var(--color-muted-light);
    transition: transform 0.15s;
  }

  .issue-chevron.expanded {
    transform: rotate(180deg);
  }

  .issue-detail {
    padding: 0 1rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    border-top: 1px solid var(--color-accent);
  }

  .issue-desc {
    font-size: 0.8125rem;
    color: var(--color-muted);
    margin: 0.875rem 0 0;
    line-height: 1.5;
  }

  .issue-meta-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.5rem;
  }

  .issue-meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .issue-meta-label {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted-light);
  }

  .issue-meta-code {
    font-size: 0.75rem;
    font-family: "SF Mono", Monaco, Menlo, monospace;
    color: var(--color-fg);
    background: var(--color-accent);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    width: fit-content;
  }

  .issue-sql {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .issue-sql-label {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-muted-light);
  }

  .issue-sql-pre {
    font-size: 0.75rem;
    font-family: "SF Mono", Monaco, Menlo, monospace;
    background: var(--color-surface);
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0;
    line-height: 1.6;
    color: var(--color-fg);
  }

  .issue-solution {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    background: var(--color-primary-subtle);
    border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
    border-radius: 0.5rem;
    padding: 0.75rem;
  }

  .issue-solution-label {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-primary);
  }

  .issue-solution-body {
    font-size: 0.8125rem;
    line-height: 1.6;
    color: var(--color-fg);
  }

  .issue-solution-body :global(code) {
    font-size: 0.75rem;
    font-family: "SF Mono", Monaco, Menlo, monospace;
    background: var(--color-accent);
    padding: 0.0625rem 0.375rem;
    border-radius: 0.25rem;
  }

  .issue-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.25rem;
  }

  .issue-severity-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .issue-severity-dot.critical { background: var(--color-danger); }
  .issue-severity-dot.warning { background: var(--color-warning); }
  .issue-severity-dot.info { background: var(--color-info); }

  .issue-type-badge {
    flex-shrink: 0;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    white-space: nowrap;
  }

  /* Security-specific styles */
  .sec-type-badge {
    flex-shrink: 0;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    white-space: nowrap;
  }

  .sec-confidence {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.0625rem 0.375rem;
    border-radius: 0.25rem;
  }

  .sec-conf-high {
    background: var(--color-danger-subtle);
    color: var(--color-danger);
  }

  .sec-conf-medium {
    background: var(--color-warning-subtle);
    color: var(--color-warning-dark);
  }

  .sec-conf-weak {
    background: var(--color-accent);
    color: var(--color-muted);
  }

  .sec-solution {
    background: var(--color-danger-subtle);
    border-color: color-mix(in srgb, var(--color-danger) 20%, transparent);
  }

  .sec-solution .issue-solution-label {
    color: var(--color-danger);
  }

  .sec-ref-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-info);
    text-decoration: none;
    margin-right: auto;
  }

  .sec-ref-link:hover {
    text-decoration: underline;
  }
</style>

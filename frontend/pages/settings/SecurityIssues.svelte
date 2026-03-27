<script>
  import { router } from "@inertiajs/svelte";
  import IssueCard from "./IssueCard.svelte";

  let { issues = [], base = "/daylight" } = $props();
  let expandedSecIssue = $state(null);

  function toggleSecIssue(id) { expandedSecIssue = expandedSecIssue === id ? null : id; }

  function dismissSecIssue(id, status) {
    router.patch(`${base}/settings/security_issues/${id}`, { new_status: status }, { preserveScroll: true });
  }

  const secTypeLabels = {
    injection: "Injection",
    xss: "XSS",
    csrf: "CSRF",
    mass_assignment: "Mass Assignment",
    rce: "Remote Code Exec",
    redirect: "Unsafe Redirect",
    file_access: "File Access",
    config: "Configuration",
    auth: "Authentication",
    render: "Dynamic Render",
    other: "Other"
  };

  const secTypeColors = {
    injection: "sec-type-injection",
    xss: "sec-type-xss",
    csrf: "sec-type-csrf",
    rce: "sec-type-rce",
    mass_assignment: "sec-type-mass",
    redirect: "sec-type-redirect",
    file_access: "sec-type-file",
    config: "sec-type-config",
    auth: "sec-type-auth",
    render: "sec-type-render",
    other: "sec-type-other"
  };

  let secCriticalCount = $derived(issues.filter(i => i.severity === "critical").length);
  let secWarningCount = $derived(issues.filter(i => i.severity === "warning").length);
</script>

{#if issues.length > 0}
  <div class="issues-section">
    <div class="issues-header">
      <h2 class="section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Security Issues
      </h2>
      <div class="sec-counts">
        {#if secCriticalCount > 0}
          <span class="issues-count sec-count-critical">{secCriticalCount} critical</span>
        {/if}
        {#if secWarningCount > 0}
          <span class="issues-count sec-count-warning">{secWarningCount} warning</span>
        {/if}
        <span class="issues-count">{issues.length} total</span>
      </div>
    </div>

    <div class="issues-list">
      {#each issues as issue (issue.id)}
        <IssueCard
          {issue}
          expanded={expandedSecIssue === issue.id}
          ontoggle={toggleSecIssue}
          ondismiss={dismissSecIssue}
          variant="security"
          typeLabel={secTypeLabels[issue.issue_type] || issue.warning_type}
          typeClass={secTypeColors[issue.issue_type] || ''}
        />
      {/each}
    </div>
  </div>
{/if}

<style>
  .issues-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .issues-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .section-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--color-fg);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .issues-count {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background: var(--color-warning-subtle);
    color: var(--color-warning-dark);
    border: 1px solid var(--color-warning-border);
  }

  .issues-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .sec-counts {
    display: flex;
    gap: 0.375rem;
  }

  .sec-count-critical {
    background: var(--color-danger-subtle);
    color: var(--color-danger);
    border-color: var(--color-danger-border);
  }

  .sec-count-warning {
    background: var(--color-warning-subtle);
    color: var(--color-warning-dark);
    border-color: var(--color-warning-border);
  }

  /* Security type badge colors - applied via :global since they're in IssueCard */
  :global(.sec-type-injection), :global(.sec-type-rce) {
    background: var(--color-danger-subtle);
    color: var(--color-danger);
  }

  :global(.sec-type-xss) {
    background: var(--color-warning-subtle);
    color: var(--color-warning-dark);
  }

  :global(.sec-type-csrf), :global(.sec-type-auth) {
    background: var(--color-purple-subtle);
    color: var(--color-purple);
  }

  :global(.sec-type-mass), :global(.sec-type-redirect) {
    background: var(--color-info-subtle);
    color: var(--color-info);
  }

  :global(.sec-type-file), :global(.sec-type-render) {
    background: var(--color-warning-subtle);
    color: var(--color-warning-darker);
  }

  :global(.sec-type-config), :global(.sec-type-other) {
    background: var(--color-accent);
    color: var(--color-muted);
  }
</style>

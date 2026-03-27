<script>
  import { router } from "@inertiajs/svelte";
  import IssueCard from "./IssueCard.svelte";

  let { issues = [], base = "/daylight" } = $props();
  let expandedIssue = $state(null);

  function toggleIssue(id) { expandedIssue = expandedIssue === id ? null : id; }

  function dismissIssue(id, status) {
    router.patch(`${base}/settings/performance_issues/${id}`, { new_status: status }, { preserveScroll: true });
  }

  const typeLabels = {
    n_plus_one: "N+1 Query",
    slow_query: "Slow Query",
    counter_cache: "Counter Cache"
  };
</script>

{#if issues.length > 0}
  <div class="issues-section">
    <div class="issues-header">
      <h2 class="section-title">Performance Issues</h2>
      <span class="issues-count">{issues.length} open</span>
    </div>

    <div class="issues-list">
      {#each issues as issue (issue.id)}
        <IssueCard
          {issue}
          expanded={expandedIssue === issue.id}
          ontoggle={toggleIssue}
          ondismiss={dismissIssue}
          variant="performance"
          typeLabel={typeLabels[issue.issue_type] || issue.issue_type}
          typeClass={issue.issue_type}
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

  /* Performance-specific type badge colors */
  :global(.issue-type-badge.n_plus_one) {
    background: var(--color-danger-subtle);
    color: var(--color-danger);
  }

  :global(.issue-type-badge.slow_query) {
    background: var(--color-warning-subtle);
    color: var(--color-warning-dark);
  }

  :global(.issue-type-badge.counter_cache) {
    background: var(--color-info-subtle);
    color: var(--color-info);
  }
</style>

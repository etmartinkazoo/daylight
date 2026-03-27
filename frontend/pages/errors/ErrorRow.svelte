<script>
  import Button from "@/components/ui/Button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { UserIcon } from "@hugeicons/core-free-icons";

  let { error, selected = false, onselect, onopen, onstatuschange } = $props();
</script>

<tr class:selected>
  <td onclick={(e) => e.stopPropagation()}>
    <input type="checkbox" checked={selected} onchange={onselect} />
  </td>
  <td>
    <button class="cell-btn" onclick={onopen}>
      <strong>{error.error_class}</strong>
      {#if error.severity === "performance"}
        <span class="perf">
          avg: {error.avg_duration_ms ?? "—"}ms, max: {error.max_duration_ms ?? "—"}ms, exceeded: {error.exceeded_count ?? 0} times
        </span>
      {:else}
        <span class="msg">{error.message}</span>
      {/if}
    </button>
  </td>
  <td style="text-align:center;">
    <span class="count-badge">{error.occurrences_count}</span>
    {#if error.affected_users_count > 0}
      <span class="users">
        <HugeiconsIcon icon={UserIcon} size={10} />
        {error.affected_users_count}
      </span>
    {/if}
  </td>
  <td>
    <span class="status" data-status={error.status}>{error.status}</span>
  </td>
  <td>
    <span class="time">{error.last_seen_ago}</span>
  </td>
  <td style="text-align:right;" onclick={(e) => e.stopPropagation()}>
    {#if error.status === "open"}
      <Button variant="outline" size="sm" onclick={() => onstatuschange(error.id, "resolved")}>Resolve</Button>
    {:else}
      <Button variant="outline" size="sm" onclick={() => onstatuschange(error.id, "open")}>Reopen</Button>
    {/if}
  </td>
</tr>

<style>
  .selected {
    background: #eff6ff;
  }

  .cell-btn {
    width: 100%;
    border: none;
    background: none;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;

    strong {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-fg);
    }
  }

  .msg {
    font-size: 0.6875rem;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .perf {
    font-size: 0.6875rem;
    color: var(--color-warning);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.5rem;
    height: 1.375rem;
    padding: 0 0.375rem;
    font-size: 0.6875rem;
    font-weight: 700;
    background: var(--color-accent);
    color: var(--color-fg-tertiary);
    border-radius: 999px;
    font-variant-numeric: tabular-nums;
  }

  .users {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    font-size: 0.5625rem;
    font-weight: 600;
    color: var(--color-muted);
    margin-left: 0.25rem;
    display: block;
    margin-top: 0.25rem;
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

  .time {
    font-size: 0.75rem;
    color: var(--color-muted);
  }
</style>

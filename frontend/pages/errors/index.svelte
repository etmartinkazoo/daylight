<script>
  import { router, usePage } from "@inertiajs/svelte";
  import DaylightLayout from "../DaylightLayout.svelte";
  import Button from "@/components/ui/Button.svelte";
  import Table from "@/components/ui/Table.svelte";
  import SortableHeader from "@/components/ui/SortableHeader.svelte";
  import StatCard from "@/components/ui/StatCard.svelte";
  import BulkActions from "@/components/ui/BulkActions.svelte";
  import DonutChart from "@/components/charts/DonutChart.svelte";
  import InteractiveBarChart from "@/components/charts/InteractiveBarChart.svelte";
  import Input from "@/components/ui/Input.svelte";
  import AutoRefresh from "@/components/ui/AutoRefresh.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { CancelCircleIcon, Search01Icon } from "@hugeicons/core-free-icons";
  import ExportButton from "@/components/ui/ExportButton.svelte";
  import Tabs from "@/components/ui/Tabs.svelte";
  import { Form, InfiniteScroll, Link, usePoll } from "@inertiajs/svelte";
  import { toggleSelect, selectAllIds } from "@/lib/utils.js";
  import ErrorSheet from "./ErrorSheet.svelte";
  import ErrorRow from "./ErrorRow.svelte";

  let {
    errors = [],
    counts = {},
    status = "open",
    query = "",
    error_series = [],
    unhandled_count = 0,
  } = $props();
  const pageStore = usePage();
  let base = $derived(pageStore.props?.base_path || "/daylight");

  let searchVal = $state(query || "");
  $effect(() => { searchVal = query || ""; });
  let selectedIds = $state([]);
  let sheetOpen = $state(false);
  let sheetError = $state(null);
  let refreshInterval = $state(0);
  let handledFilter = $state("all");
  let severityFilter = $state("");

  const { start, stop } = usePoll(
    1000,
    {
      preserveState: true,
      preserveScroll: true,
      only: ["errors", "counts", "error_series", "unhandled_count"],
    },
    { autoStart: false },
  );

  $effect(() => {
    if (refreshInterval > 0) start(refreshInterval);
    else stop();
  });

  function updateStatus(id, newStatus) {
    router.patch(`${base}/errors/${id}`, { status: newStatus, filter_status: status });
  }

  function batchAction(action) {
    router.post(
      `${base}/errors/batch`,
      { ids: selectedIds, action_type: action, filter_status: status },
      { onSuccess: () => { selectedIds = []; } },
    );
  }

  let allSelected = $derived(errors.length > 0 && selectedIds.length === errors.length);
  let last24hCount = $derived(counts.last_24h || 0);
  let totalErrors = $derived((counts.open || 0) + (counts.resolved || 0) + (counts.ignored || 0));

  let donutSegments = $derived([
    { value: counts.open || 0, color: "#ef4444", label: "Open" },
    { value: counts.resolved || 0, color: "#22c55e", label: "Resolved" },
    { value: counts.ignored || 0, color: "#94a3b8", label: "Ignored" },
  ]);

  const tabs = [
    { key: "open", label: "Open" },
    { key: "resolved", label: "Resolved" },
    { key: "ignored", label: "Ignored" },
    { key: "all", label: "All" },
  ];

  let bulkActions = $derived.by(() => {
    const actions = [];
    if (status !== "resolved")
      actions.push({ label: "Resolve", onclick: () => batchAction("resolve") });
    if (status !== "ignored")
      actions.push({ label: "Ignore", onclick: () => batchAction("ignore") });
    if (status !== "open")
      actions.push({ label: "Reopen", onclick: () => batchAction("reopen") });
    actions.push({ label: "Delete", variant: "danger", onclick: () => batchAction("delete") });
    return actions;
  });
</script>

<svelte:head><title>Daylight</title></svelte:head>

<DaylightLayout>
  <div class="page">
    <div class="header-actions">
      <AutoRefresh bind:interval={refreshInterval} />
      <ExportButton baseUrl={`${base}/errors/export`} />
    </div>

    <div class="stats-row">
      <div class="stats-cards">
        <StatCard label="Open" value={counts.open || 0} danger={counts.open > 0} />
        <StatCard label="Last 24h" value={last24hCount} />
        <StatCard label="Unhandled" value={unhandled_count} danger={unhandled_count > 0} />
        <StatCard label="Resolved" value={counts.resolved || 0} color="var(--color-success)" />
        <StatCard label="Ignored" value={counts.ignored || 0} color="var(--color-muted)" />
        <StatCard label="Performance" value={counts.performance || 0} color="var(--color-warning)" />
      </div>
      {#if totalErrors > 0}
        <div class="stats-donut">
          <DonutChart segments={donutSegments} size={100} strokeWidth={12} centerValue={String(totalErrors)} centerLabel="total" />
        </div>
      {/if}
    </div>

    {#if error_series.length > 0}
      <InteractiveBarChart
        data={error_series.map((d) => ({ ...d, errors: d.v }))}
        series={[{ key: "errors", label: "Errors", color: "#ef4444" }]}
        title="Error Volume"
        description="Error occurrences over time"
        height={250}
      />
    {/if}

    <Tabs
      value={status}
      {tabs}
      href={`${base}/errors`}
      data={{ q: searchVal || undefined, severity: severityFilter || undefined }}
      {counts}
    >
      {#snippet extra()}
        <div class="pills">
          <Link href={`${base}/errors`} data={{ status, q: searchVal || undefined, severity: severityFilter || undefined }} preserveState={true} class={handledFilter === 'all' ? 'active' : ''}>All</Link>
          <Link href={`${base}/errors`} data={{ status, q: searchVal || undefined, severity: severityFilter || undefined, handled: false }} preserveState={true} class={handledFilter === 'unhandled' ? 'active' : ''}>
            Unhandled
            {#if unhandled_count > 0}<span>{unhandled_count}</span>{/if}
          </Link>
        </div>
        <div class="pills">
          <Link href={`${base}/errors`} data={{ status, q: searchVal || undefined }} preserveState={true} class={!severityFilter ? 'active' : ''}>All Types</Link>
          <Link href={`${base}/errors`} data={{ status, q: searchVal || undefined, severity: "performance" }} preserveState={true} class={severityFilter === 'performance' ? 'active' : ''}>
            Performance {#if counts.performance}<span>{counts.performance}</span>{/if}
          </Link>
        </div>
      {/snippet}
    </Tabs>

    <Form action={`${base}/errors`} method="get" class="search-form" preserveState>
      <input type="hidden" name="status" value={status} />
      {#if severityFilter}<input type="hidden" name="severity" value={severityFilter} />{/if}
      <div class="search-wrapper">
        <span><HugeiconsIcon icon={Search01Icon} size={16} /></span>
        <Input type="text" name="q" placeholder="Search errors..." bind:value={searchVal} />
      </div>
    </Form>

    <BulkActions count={selectedIds.length} actions={bulkActions} oncancel={() => (selectedIds = [])} />

    {#if errors.length === 0}
      <div class="empty">
        <span><HugeiconsIcon icon={CancelCircleIcon} size={48} /></span>
        <p>No errors found</p>
        <p>
          {#if query}No errors matching "{query}"{:else}Nothing to show for this filter{/if}
        </p>
      </div>
    {:else}
      <div class="data-table">
        <InfiniteScroll data="errors" itemsElement="#errors-tbody" startElement="#errors-thead">
          <Table>
            <thead id="errors-thead">
              <tr>
                <th style="width: 2rem;">
                  <input type="checkbox" checked={allSelected} onchange={() => allSelected ? (selectedIds = []) : (selectedIds = selectAllIds(errors))} />
                </th>
                <th><SortableHeader column="error_class" label="Error" /></th>
                <th style="text-align:center; width: 5rem;"><SortableHeader column="occurrences_count" label="Count" /></th>
                <th style="width: 6.5rem;">Status</th>
                <th style="width: 8rem;"><SortableHeader column="last_seen_at" label="Last Seen" /></th>
                <th style="width: 6rem;"></th>
              </tr>
            </thead>
            <tbody id="errors-tbody">
              {#each errors as error (error.id)}
                <ErrorRow
                  {error}
                  selected={selectedIds.includes(error.id)}
                  onselect={() => (selectedIds = toggleSelect(selectedIds, error.id))}
                  onopen={() => { sheetError = error; sheetOpen = true; }}
                  onstatuschange={updateStatus}
                />
              {/each}
            </tbody>
          </Table>
        </InfiniteScroll>
      </div>
    {/if}
  </div>
</DaylightLayout>

<ErrorSheet bind:open={sheetOpen} error={sheetError} onstatuschange={updateStatus} />

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .stats-row {
    display: flex;
    align-items: stretch;
    gap: 1.25rem;

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 0.75rem;
      flex: 1;
    }

    .stats-donut {
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
  }

  :global(.search-form) {
    display: flex;
  }

  .search-wrapper {
    position: relative;
    flex: 1;

    :global(.input) { padding-left: 2.25rem; }

    span {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-muted-light);
      pointer-events: none;
      display: flex;
    }
  }

  .data-table {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .empty {
    text-align: center;
    padding: 4rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;

    span { color: var(--color-muted-light); }
    p:first-of-type { font-size: 1rem; font-weight: 600; color: var(--color-fg); margin: 0; }
    p:last-of-type { font-size: 0.8125rem; color: var(--color-muted); margin: 0; }
  }

  .pills {
    display: flex;
    gap: 0.25rem;
    background: var(--color-accent);
    border-radius: 0.5rem;
    padding: 0.25rem;

    :global(a) {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--color-muted);
      border-radius: 0.375rem;
      transition: all 0.15s;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;

      &:hover { color: var(--color-fg); background: var(--color-white-overlay); }
      &.active { color: var(--color-fg); background: var(--color-bg); font-weight: 600; box-shadow: 0 1px 2px var(--color-border-alpha); }
    }

    span {
      font-size: 0.625rem;
      font-weight: 700;
      background: var(--color-danger-subtle);
      color: var(--color-danger);
      padding: 0.0625rem 0.375rem;
      border-radius: 9999px;
    }
  }
</style>

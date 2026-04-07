import { useState, useEffect } from "react";
import { router, Link, InfiniteScroll, usePoll } from "@inertiajs/react";
import DaylightLayout from "../DaylightLayout";
import { StatCard } from "@/components/ui/stat-card";
import { BulkActions } from "@/components/ui/bulk-actions";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { TabsNav } from "@/components/ui/tabs-nav";
import { SortableHeader } from "@/components/ui/sortable-header";
import { ExportButton } from "@/components/ui/export-button";
import { Input } from "@/components/ui/input";
import DonutChart from "@/components/charts/DonutChart";
import InteractiveBarChart from "@/components/charts/InteractiveBarChart";
import ErrorSheet from "./ErrorSheet";
import ErrorRow from "./ErrorRow";
import { toggleSelect, selectAllIds } from "@/lib/utils.js";
import { HugeiconsIcon } from "@hugeicons/react";
import { CancelCircleIcon, Search01Icon } from "@hugeicons/core-free-icons";

export default function ErrorsIndex({
  errors = [], counts = {}, status = "open", query = "", error_series = [],
  unhandled_count = 0, base_path: base = "/daylight",
  sort_column = null, sort_direction = null,
}) {
  const [searchVal, setSearchVal] = useState(query || "");
  const [selectedIds, setSelectedIds] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetError, setSheetError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(0);

  useEffect(() => { setSearchVal(query || ""); }, [query]);

  const { start, stop } = usePoll(
    1000,
    { preserveState: true, preserveScroll: true, only: ["errors", "counts", "error_series", "unhandled_count"] },
    { autoStart: false },
  );

  useEffect(() => {
    if (refreshInterval > 0) start(refreshInterval);
    else stop();
  }, [refreshInterval]);

  function updateStatus(id, newStatus) {
    router.patch(`${base}/errors/${id}`, { status: newStatus, filter_status: status });
  }

  function batchAction(action) {
    router.post(
      `${base}/errors/batch`,
      { ids: selectedIds, action_type: action, filter_status: status },
      { onSuccess: () => setSelectedIds([]) },
    );
  }

  const allSelected = errors.length > 0 && selectedIds.length === errors.length;
  const totalErrors = (counts.open || 0) + (counts.resolved || 0) + (counts.ignored || 0);
  const donutSegments = [
    { value: counts.open || 0, color: "#ef4444", label: "Open" },
    { value: counts.resolved || 0, color: "#22c55e", label: "Resolved" },
    { value: counts.ignored || 0, color: "#94a3b8", label: "Ignored" },
  ];

  const tabs = [
    { key: "open", label: "Open" },
    { key: "resolved", label: "Resolved" },
    { key: "ignored", label: "Ignored" },
    { key: "all", label: "All" },
  ];

  const bulkActions = [
    ...(status !== "resolved" ? [{ label: "Resolve", onclick: () => batchAction("resolve") }] : []),
    ...(status !== "ignored" ? [{ label: "Ignore", onclick: () => batchAction("ignore") }] : []),
    ...(status !== "open" ? [{ label: "Reopen", onclick: () => batchAction("reopen") }] : []),
    { label: "Delete", variant: "danger", onclick: () => batchAction("delete") },
  ];

  function handleSearch(e) {
    e.preventDefault();
    router.get(`${base}/errors`, { status, q: searchVal || undefined }, { preserveState: true, replace: true });
  }

  return (
    <DaylightLayout>
      <div className="dl-page">
        <div className="header-actions">
          <AutoRefresh interval={refreshInterval} onChange={setRefreshInterval} />
          <ExportButton baseUrl={`${base}/errors/export`} />
        </div>

        <div className="stats-row">
          <div className="stats-cards">
            <StatCard label="Open" value={counts.open || 0} danger={counts.open > 0} />
            <StatCard label="Last 24h" value={counts.last_24h || 0} />
            <StatCard label="Unhandled" value={unhandled_count} danger={unhandled_count > 0} />
            <StatCard label="Resolved" value={counts.resolved || 0} color="var(--color-success)" />
            <StatCard label="Ignored" value={counts.ignored || 0} color="var(--color-muted)" />
            <StatCard label="Performance" value={counts.performance || 0} color="var(--color-warning)" />
          </div>
          {totalErrors > 0 && (
            <div className="stats-donut">
              <DonutChart segments={donutSegments} size={100} strokeWidth={12} centerValue={String(totalErrors)} centerLabel="total" />
            </div>
          )}
        </div>

        {error_series.length > 0 && (
          <InteractiveBarChart
            data={error_series.map((d) => ({ ...d, errors: d.v }))}
            series={[{ key: "errors", label: "Errors", color: "#ef4444" }]}
            title="Error Volume"
            description="Error occurrences over time"
            height={250}
          />
        )}

        <TabsNav
          value={status}
          tabs={tabs}
          href={`${base}/errors`}
          data={{ q: searchVal || undefined }}
          counts={counts}
          extra={
            <>
              <div className="pills">
                <Link href={`${base}/errors`} data={{ status, q: searchVal || undefined }} preserveState>All</Link>
                <Link href={`${base}/errors`} data={{ status, q: searchVal || undefined, handled: false }} preserveState>
                  Unhandled {unhandled_count > 0 && <span>{unhandled_count}</span>}
                </Link>
              </div>
              <div className="pills">
                <Link href={`${base}/errors`} data={{ status, q: searchVal || undefined }} preserveState>All Types</Link>
                <Link href={`${base}/errors`} data={{ status, q: searchVal || undefined, severity: "performance" }} preserveState>
                  Performance {counts.performance && <span>{counts.performance}</span>}
                </Link>
              </div>
            </>
          }
        />

        <form onSubmit={handleSearch} className="search-form">
          <input type="hidden" name="status" value={status} />
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              <HugeiconsIcon icon={Search01Icon} size={14} />
            </span>
            <Input
              type="text"
              name="q"
              placeholder="Search errors..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="pl-8"
            />
          </div>
        </form>

        <BulkActions count={selectedIds.length} actions={bulkActions} onCancel={() => setSelectedIds([])} />

        {errors.length === 0 ? (
          <div className="empty">
            <span><HugeiconsIcon icon={CancelCircleIcon} size={48} /></span>
            <p>No errors found</p>
            <p>{query ? `No errors matching "${query}"` : "Nothing to show for this filter"}</p>
          </div>
        ) : (
          <div className="dl-data-table">
            <InfiniteScroll data="errors" itemsElement="#errors-tbody" startElement="#errors-thead">
              <table className="dl-table">
                <thead id="errors-thead">
                  <tr>
                    <th style={{ width: "2rem" }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => setSelectedIds(allSelected ? [] : selectAllIds(errors))}
                      />
                    </th>
                    <th><SortableHeader column="error_class" label="Error" sort_column={sort_column} sort_direction={sort_direction} /></th>
                    <th style={{ textAlign: "center", width: "5rem" }}><SortableHeader column="occurrences_count" label="Count" sort_column={sort_column} sort_direction={sort_direction} /></th>
                    <th style={{ width: "6.5rem" }}>Status</th>
                    <th style={{ width: "8rem" }}><SortableHeader column="last_seen_at" label="Last Seen" sort_column={sort_column} sort_direction={sort_direction} /></th>
                    <th style={{ width: "6rem" }}></th>
                  </tr>
                </thead>
                <tbody id="errors-tbody">
                  {errors.map((error) => (
                    <ErrorRow
                      key={error.id}
                      error={error}
                      selected={selectedIds.includes(error.id)}
                      onSelect={() => setSelectedIds(toggleSelect(selectedIds, error.id))}
                      onOpen={() => { setSheetError(error); setSheetOpen(true); }}
                      onStatusChange={updateStatus}
                    />
                  ))}
                </tbody>
              </table>
            </InfiniteScroll>
          </div>
        )}
      </div>

      <ErrorSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        error={sheetError}
        onStatusChange={updateStatus}
      />
    </DaylightLayout>
  );
}

import AppLayout from "@/layouts/app-layout";
import ErrorRow from "@/components/errors/ErrorRow";
import ErrorSheet from "@/components/errors/ErrorSheet";
import ErrorsLayout from "@/layouts/errors-layout";
import { BulkActions } from "@/components/ui/bulk-actions";
import { CancelCircleIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@/components/ui/input";
import { InteractiveBarChart } from "@/components/charts/InteractiveBarChart";
import { SortableHeader } from "@/components/ui/sortable-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { router, InfiniteScroll } from "@inertiajs/react";
import { toggleSelect, selectAllIds } from "@/lib/utils.js";
import { useState, useEffect } from "react";

export default function ErrorsIndex({
  errors = [],
  counts = {},
  status = "open",
  query = "",
  error_series = [],
  unhandled_count = 0,
  performance_count = 0,
  base_path: base = "/daylight",
  sort_column = null,
  sort_direction = null,
}) {
  const [searchVal, setSearchVal] = useState(query || "");
  const [selectedIds, setSelectedIds] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetError, setSheetError] = useState(null);
  useEffect(() => {
    setSearchVal(query || "");
  }, [query]);

  // After status actions, return to the same tab
  function updateStatus(id, newStatus) {
    router.patch(`${base}/errors/${id}`, {
      status: newStatus,
      return_status: status,
    });
  }

  function batchAction(action) {
    router.post(
      `${base}/errors/batch`,
      { ids: selectedIds, action_type: action, return_status: status },
      { onSuccess: () => setSelectedIds([]) },
    );
  }

  const allSelected = errors.length > 0 && selectedIds.length === errors.length;

  const bulkActions = [
    ...(status !== "resolved"
      ? [{ label: "Resolve", onclick: () => batchAction("resolve") }]
      : []),
    ...(status !== "ignored"
      ? [{ label: "Ignore", onclick: () => batchAction("ignore") }]
      : []),
    ...(status !== "open"
      ? [{ label: "Reopen", onclick: () => batchAction("reopen") }]
      : []),
    {
      label: "Delete",
      variant: "danger",
      onclick: () => batchAction("delete"),
    },
  ];

  function handleSearch(e) {
    e.preventDefault();
    const path =
      status === "open" ? `${base}/errors` : `${base}/errors/${status}`;
    router.get(
      path,
      { q: searchVal || undefined },
      { preserveState: true, replace: true },
    );
  }

  return (
    <AppLayout>
      <ErrorsLayout>
        <div className="flex flex-col gap-5 p-6">
          <div className="grid grid-cols-3 overflow-hidden rounded-xl border divide-x divide-border bg-card">
            <StatCard
              label="Unhandled"
              value={unhandled_count}
              danger={unhandled_count > 0}
            />
            <StatCard label="Last 24h" value={counts.last_24h || 0} />
            <StatCard
              label="Performance"
              value={performance_count}
              variant="warning"
            />
          </div>

          {error_series.length > 0 && (
            <InteractiveBarChart
              data={error_series.map((d) => ({ ...d, errors: d.v }))}
              series={[{ key: "errors", label: "Errors", color: "#ef4444" }]}
              title="Error Volume"
              description="Error occurrences over time"
              height={220}
            />
          )}

          <form onSubmit={handleSearch}>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                <HugeiconsIcon icon={Search01Icon} size={14} />
              </span>
              <Input
                type="text"
                name="q"
                placeholder="Search errors…"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="pl-8"
              />
            </div>
          </form>

          <BulkActions
            count={selectedIds.length}
            actions={bulkActions}
            onCancel={() => setSelectedIds([])}
          />

          {errors.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <HugeiconsIcon icon={CancelCircleIcon} />
                </EmptyMedia>
                <EmptyTitle>No errors found</EmptyTitle>
                <EmptyDescription>
                  {query
                    ? `No errors matching "${query}"`
                    : `No ${status === "all" ? "" : status + " "}errors`}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <InfiniteScroll
              data="errors"
              itemsElement="#errors-tbody"
              startElement="#errors-thead"
            >
              <Table>
                <TableHeader id="errors-thead">
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() =>
                          setSelectedIds(
                            allSelected ? [] : selectAllIds(errors),
                          )
                        }
                      />
                    </TableHead>
                    <TableHead>
                      <SortableHeader
                        column="error_class"
                        label="Error"
                        sort_column={sort_column}
                        sort_direction={sort_direction}
                      />
                    </TableHead>
                    <TableHead className="w-20 text-center">
                      <SortableHeader
                        column="occurrences_count"
                        label="Count"
                        sort_column={sort_column}
                        sort_direction={sort_direction}
                      />
                    </TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody id="errors-tbody">
                  {errors.map((error) => (
                    <ErrorRow
                      key={error.id}
                      error={error}
                      selected={selectedIds.includes(error.id)}
                      onSelect={() =>
                        setSelectedIds(toggleSelect(selectedIds, error.id))
                      }
                      onOpen={() => {
                        setSheetError(error);
                        setSheetOpen(true);
                      }}
                      onStatusChange={updateStatus}
                    />
                  ))}
                </TableBody>
              </Table>
            </InfiniteScroll>
          )}
        </div>

        <ErrorSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          error={sheetError}
          onStatusChange={updateStatus}
        />
      </ErrorsLayout>
    </AppLayout>
  );
}

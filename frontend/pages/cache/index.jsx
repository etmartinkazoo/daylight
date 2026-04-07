import { useState } from "react";
import { router, InfiniteScroll } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import DaylightLayout from "../DaylightLayout";
import PeriodSelect from "../PeriodSelect";
import EwSheet from "../errors/EwSheet";
import { AreaChart } from "@/components/charts/AreaChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { SortableHeader } from "@/components/ui/sortable-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { fmt } from "@/lib/formatters.js";

function hitRateColor(rate) {
  if (rate == null) return "";
  if (rate >= 90) return "text-green-500 font-medium";
  if (rate >= 70) return "text-yellow-500 font-medium";
  return "text-red-500 font-medium";
}

export default function CacheIndex({
  key_groups = [], period = "24h", total_events = 0,
  hit_rate = 0, total_reads = 0, total_hits = 0,
  volume_series = [], base_path: base = "/daylight",
  sort_column = null, sort_direction = null,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState(null);

  const hitRateDisplay = `${hit_rate.toFixed(1)}%`;
  const misses = total_reads - total_hits;

  const donutSegments = [
    { value: total_hits, color: "#22c55e", label: "Hits" },
    { value: misses, color: "#ef4444", label: "Misses" },
  ].filter((s) => s.value > 0);

  const sheetAi = sheetItem
    ? `Cache Key Pattern: ${sheetItem.key_pattern}\nReads: ${sheetItem.reads}\nHit Rate: ${sheetItem.hit_rate != null ? sheetItem.hit_rate.toFixed(1) + "%" : "N/A"}\nAvg Duration: ${fmt(sheetItem.avg_duration)}`
    : "";

  function changePeriod(p) { router.get(`${base}/cache`, { period: p }, { preserveState: true }); }
  function openPattern(p) { setSheetItem(p); setSheetOpen(true); }

  return (
    <DaylightLayout>
      <div className="flex flex-col gap-6 p-6">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">Cache</h1>
            <p className="text-sm text-muted-foreground">Cache performance and key patterns in the last {period}</p>
          </div>
          <PeriodSelect value={period} onChange={changePeriod} />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardDescription>Hit Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-semibold tabular-nums", hitRateColor(hit_rate))}>{hitRateDisplay}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total Reads</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{total_reads.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Cache Hits</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{total_hits.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Total Events</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{total_events.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts row */}
        {((total_hits + misses) > 0 || volume_series.length >= 2) && (
          <div className="flex flex-wrap gap-4">
            {(total_hits + misses) > 0 && (
              <Card className="min-w-[220px] flex-1">
                <CardHeader>
                  <CardTitle className="text-sm">Hits vs Misses</CardTitle>
                </CardHeader>
                <Separator />
                <CardContent className="flex items-center justify-center py-6">
                  <DonutChart segments={donutSegments} size={110} strokeWidth={12} centerValue={hitRateDisplay} centerLabel="hit rate" />
                </CardContent>
              </Card>
            )}
            {volume_series.length >= 2 && (
              <Card className="min-w-[300px] flex-[2]">
                <CardHeader>
                  <CardTitle className="text-sm">Cache Event Volume</CardTitle>
                  <CardDescription>Over time</CardDescription>
                </CardHeader>
                <Separator />
                <CardContent>
                  <AreaChart data={volume_series} width={420} height={80} color="#8b5cf6" />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Key patterns table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Key Patterns</CardTitle>
            <CardDescription>{key_groups.length} patterns</CardDescription>
          </CardHeader>
          <Separator />
          {key_groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <span>No cache events recorded in this period.</span>
            </div>
          ) : (
            <InfiniteScroll data="key_groups" itemsElement="#cache-tbody" startElement="#cache-thead">
              <Table>
                <TableHeader id="cache-thead">
                  <TableRow>
                    <TableHead>Key Pattern</TableHead>
                    <TableHead className="w-20 text-right">
                      <SortableHeader column="reads" label="Reads" sort_column={sort_column} sort_direction={sort_direction} />
                    </TableHead>
                    <TableHead className="w-24 text-right">Hit Rate</TableHead>
                    <TableHead className="w-20 text-right">
                      <SortableHeader column="avg_duration" label="Avg" sort_column={sort_column} sort_direction={sort_direction} />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody id="cache-tbody">
                  {key_groups.map((p, i) => (
                    <TableRow
                      key={`${p.key_pattern}:${i}`}
                      className="cursor-pointer"
                      onClick={() => openPattern(p)}
                    >
                      <TableCell className="max-w-0 truncate font-mono text-xs">{p.key_pattern}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.reads}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={hitRateColor(p.hit_rate)}>
                          {p.hit_rate != null ? `${p.hit_rate.toFixed(1)}%` : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmt(p.avg_duration)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </InfiniteScroll>
          )}
        </Card>
      </div>

      {/* Detail sheet */}
      <EwSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Cache Pattern Detail" aiContext={sheetAi}>
        {sheetItem && (
          <div className="flex flex-col gap-0 divide-y p-4">
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted-foreground">Key Pattern</span>
              <span className="font-mono text-xs">{sheetItem.key_pattern}</span>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted-foreground">Reads</span>
              <span>{sheetItem.reads}</span>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted-foreground">Hit Rate</span>
              <span className={hitRateColor(sheetItem.hit_rate)}>
                {sheetItem.hit_rate != null ? `${sheetItem.hit_rate.toFixed(1)}%` : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <span className="text-muted-foreground">Avg Duration</span>
              <span>{fmt(sheetItem.avg_duration)}</span>
            </div>
            {sheetItem.max_duration && (
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-muted-foreground">Max Duration</span>
                <span>{fmt(sheetItem.max_duration)}</span>
              </div>
            )}
            {sheetItem.total && (
              <div className="flex items-center justify-between py-3 text-sm">
                <span className="text-muted-foreground">Total Events</span>
                <span>{sheetItem.total}</span>
              </div>
            )}
          </div>
        )}
      </EwSheet>
    </DaylightLayout>
  );
}

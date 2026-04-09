# frozen_string_literal: true

module Daylight
  class CacheController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = current_period
      scope = Database::CacheEventRecord.where("occurred_at > ?", period_start(period))

      total_events = scope.count
      total_reads = scope.where(event_type: "read").count
      hits = scope.where(event_type: "read", hit: true).count
      hit_rate = total_reads > 0 ? (hits.to_f / total_reads * 100).round(1) : 0.0

      # Group by key pattern (first 100 chars of key)
      group_expr = Arel.sql("SUBSTR(key, 1, 100)")
      grouped = scope.group(group_expr).select(
        "SUBSTR(key, 1, 100) as key_pattern",
        "COUNT(*) as total",
        "SUM(CASE WHEN event_type = 'read' AND hit = 1 THEN 1 ELSE 0 END) as hits",
        "SUM(CASE WHEN event_type = 'read' THEN 1 ELSE 0 END) as reads",
        "ROUND(AVG(duration_ms), 1) as avg_duration"
      ).order(Arel.sql("total DESC"))

      count = scope.group(group_expr).count.length
      pagy, page_rows = pagy(:offset, grouped, count: count, limit: 20)
      key_groups = page_rows.map do |row|
        {
          key_pattern: row.key_pattern,
          total: row.total,
          hits: row.hits,
          reads: row.reads,
          hit_rate: row.reads.to_i > 0 ? (row.hits.to_f / row.reads * 100).round(1) : 0.0,
          avg_duration: row.avg_duration
        }
      end

      render inertia: {
        key_groups: InertiaRails.scroll(pagy) { key_groups },
        period: period,
        total_events: total_events,
        hit_rate: hit_rate,
        total_reads: total_reads,
        total_hits: hits,
        volume_series: time_series_buckets(scope, period)
      }
    end

    private

  end
end

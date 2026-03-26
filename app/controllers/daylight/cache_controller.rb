# frozen_string_literal: true

module Daylight
  class CacheController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = params[:period] || "24h"
      scope = Database::CacheEventRecord.where("occurred_at > ?", period_start(period))

      total_events = scope.count
      total_reads = scope.where(event_type: "read").count
      hits = scope.where(event_type: "read", hit: true).count
      hit_rate = total_reads > 0 ? (hits.to_f / total_reads * 100).round(1) : 0.0

      # Group by key pattern (first 100 chars of key)
      page = (params[:page] || 1).to_i
      per_page = 50
      key_groups = scope.group(Arel.sql("SUBSTR(key, 1, 100)")).select(
        "SUBSTR(key, 1, 100) as key_pattern",
        "COUNT(*) as total",
        "SUM(CASE WHEN event_type = 'read' AND hit = 1 THEN 1 ELSE 0 END) as hits",
        "SUM(CASE WHEN event_type = 'read' THEN 1 ELSE 0 END) as reads",
        "ROUND(AVG(duration_ms), 1) as avg_duration"
      ).order(Arel.sql("total DESC")).limit(per_page + 1).offset((page - 1) * per_page).map do |row|
        {
          key_pattern: row.key_pattern,
          total: row.total,
          hits: row.hits,
          reads: row.reads,
          hit_rate: row.reads.to_i > 0 ? (row.hits.to_f / row.reads * 100).round(1) : 0.0,
          avg_duration: row.avg_duration
        }
      end

      has_more = key_groups.length > per_page
      key_groups = key_groups.first(per_page)

      render inertia: "daylight/cache", props: {
        key_groups: key_groups,
        period: period,
        page: page,
        has_more: has_more,
        total_events: total_events,
        hit_rate: hit_rate,
        total_reads: total_reads,
        total_hits: hits,
        volume_series: time_series_buckets(scope, period)
      }
    end

    private

    def period_start(period)
      case period
      when "1h"  then 1.hour.ago
      when "24h" then 24.hours.ago
      when "7d"  then 7.days.ago
      when "30d" then 30.days.ago
      else 24.hours.ago
      end
    end
  end
end

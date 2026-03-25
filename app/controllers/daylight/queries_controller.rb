# frozen_string_literal: true

module Daylight
  class QueriesController < BaseController

    before_action :ensure_connected

    def index
      period = params[:period] || "24h"
      scope = Database::QueryRecord.where("occurred_at > ?", period_start(period))

      grouped = scope.group(:normalized_sql).select(
        "normalized_sql",
        "COUNT(*) as total",
        "ROUND(AVG(duration_ms), 1) as avg_duration",
        "ROUND(MAX(duration_ms), 1) as max_duration",
        "MIN(source_location) as source_location"
      ).order("avg_duration DESC").limit(50)

      queries = grouped.map do |row|
        {
          normalized_sql: row.normalized_sql,
          total: row.total,
          avg_duration: row.avg_duration,
          max_duration: row.max_duration,
          source_location: row.source_location
        }
      end

      # Slowest individual queries
      slowest = scope.order(duration_ms: :desc).limit(25).map do |q|
        {
          id: q.id,
          sql: q.sql,
          duration_ms: q.duration_ms,
          source_location: q.source_location,
          controller_action: q.controller_action,
          request_path: q.request_path,
          occurred_at: q.occurred_at
        }
      end

      render inertia: "daylight/queries", props: {
        queries: queries,
        slowest: slowest,
        period: period,
        total_queries: scope.count
      }
    end

    private

    def ensure_connected
      Database.ensure_connected!
    end

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

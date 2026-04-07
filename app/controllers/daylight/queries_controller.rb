# frozen_string_literal: true

module Daylight
  class QueriesController < BaseController
    include Daylight::TimeSeries
    include Daylight::Exportable

    before_action :ensure_connected

    def index
      period = current_period
      scope = Database::QueryRecord.where("occurred_at > ?", period_start(period))

      grouped = scope.group(:normalized_sql).select(
        "normalized_sql",
        "COUNT(*) as total",
        "ROUND(AVG(duration_ms), 1) as avg_duration",
        "ROUND(MAX(duration_ms), 1) as max_duration",
        "MIN(source_location) as source_location"
      ).order(Arel.sql(sort_order_sql(
        default: "avg_duration",
        allowed: {
          "total" => "total",
          "avg_duration" => "avg_duration",
          "max_duration" => "max_duration"
        },
        direction: "desc"
      )))

      count = scope.group(:normalized_sql).count.length
      pagy, page_rows = pagy(:offset, grouped, count: count, limit: 50)
      queries = page_rows.map do |row|
        {
          normalized_sql: row.normalized_sql,
          total: row.total,
          avg_duration: row.avg_duration,
          max_duration: row.max_duration,
          source_location: row.source_location
        }
      end

      # Slowest individual queries (fixed top 25, no pagination)
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

      # N+1 requests in period
      n_plus_one_requests = Database::RequestRecord
        .where("occurred_at > ?", period_start(period))
        .where(n_plus_one: true)
        .order(occurred_at: :desc)
        .limit(20)
        .map do |r|
          {
            id: r.id,
            path: r.path,
            controller_action: r.controller_action,
            query_count: r.query_count,
            occurred_at: r.occurred_at
          }
        end

      render inertia: {
        queries: InertiaRails.scroll(pagy) { queries },
        slowest: slowest,
        period: period,
        total_queries: scope.count,
        volume_series: time_series_buckets(scope, period),
        n_plus_one_requests: n_plus_one_requests,
        **sort_props
      }
    end

    def export
      records = Database::QueryRecord
        .where("occurred_at > ?", period_start(current_period))
        .order(occurred_at: :desc)

      render_export(
        records,
        filename: "daylight-queries",
        csv_headers: %w[id sql normalized_sql duration_ms source_location controller_action request_path occurred_at],
        json_row: ->(q) { { id: q.id, sql: q.sql, normalized_sql: q.normalized_sql, duration_ms: q.duration_ms, source_location: q.source_location, controller_action: q.controller_action, request_path: q.request_path, occurred_at: q.occurred_at } }
      ) { |q| [q.id, q.sql, q.normalized_sql, q.duration_ms, q.source_location, q.controller_action, q.request_path, q.occurred_at] }
    end

    private

  end
end

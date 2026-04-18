# frozen_string_literal: true

module Daylight
  class QueriesController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = current_period
      scope = Database::QueryRecord.where(occurred_at: period_start(period)..)

      grouped = scope.grouped_by_normalized_sql.order(sort_order_sql(
        default: "avg_duration",
        allowed: {
          "total" => "total",
          "avg_duration" => "avg_duration",
          "max_duration" => "max_duration"
        },
        direction: "desc"
      ))

      count = scope.group(:normalized_sql).count.length
      @pagy, page_rows = pagy(:offset, grouped, count: count, limit: 20)
      queries = page_rows.map do |row|
        {
          normalized_sql: row.normalized_sql,
          total: row.total,
          avg_duration: row.avg_duration,
          max_duration: row.max_duration,
          source_location: row.source_location,
          controller_action: row.controller_action,
          request_path: row.request_path
        }
      end

      n_plus_one_requests = Database::RequestRecord
        .where(occurred_at: period_start(period)..)
        .n_plus_one
        .order(occurred_at: :desc)
        .limit(20)

      @queries = queries
      @slowest = scope.order(duration_ms: :desc).limit(25)
      @period = period
      @total_queries = scope.count
      @volume_series = time_series_buckets(scope, period)
      @n_plus_one_requests = n_plus_one_requests
      sort_props.each { |k, v| instance_variable_set(:"@#{k}", v) }
    end
  end
end

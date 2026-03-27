# frozen_string_literal: true

require "csv"

module Daylight
  class QueriesController < BaseController
    include Daylight::TimeSeries

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
      ).order(Arel.sql(sort_order_sql(
        default: "avg_duration",
        allowed: {
          "total" => "total",
          "avg_duration" => "avg_duration",
          "max_duration" => "max_duration"
        },
        direction: "desc"
      )))

      page = (params[:page] || 1).to_i
      per_page = 50
      grouped = grouped.limit(per_page + 1).offset((page - 1) * per_page)

      queries = grouped.map do |row|
        {
          normalized_sql: row.normalized_sql,
          total: row.total,
          avg_duration: row.avg_duration,
          max_duration: row.max_duration,
          source_location: row.source_location
        }
      end

      has_more = queries.length > per_page
      queries = queries.first(per_page)

      # Slowest individual queries
      slowest_page = (params[:slowest_page] || 1).to_i
      slowest = scope.order(duration_ms: :desc).limit(per_page + 1).offset((slowest_page - 1) * per_page).map do |q|
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

      slowest_has_more = slowest.length > per_page
      slowest = slowest.first(per_page)

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

      render inertia: "daylight/queries/index", props: {
        queries: queries,
        slowest: slowest,
        period: period,
        page: page,
        has_more: has_more,
        slowest_page: slowest_page,
        slowest_has_more: slowest_has_more,
        total_queries: scope.count,
        volume_series: time_series_buckets(scope, period),
        n_plus_one_requests: n_plus_one_requests,
        **sort_props
      }
    end

    def export
      period = params[:period] || "24h"
      scope = Database::QueryRecord.where("occurred_at > ?", period_start(period))
      records = scope.order(occurred_at: :desc)

      if params[:format] == "json"
        render json: records.map { |q|
          { id: q.id, sql: q.sql, normalized_sql: q.normalized_sql, duration_ms: q.duration_ms, source_location: q.source_location, controller_action: q.controller_action, request_path: q.request_path, occurred_at: q.occurred_at }
        }
      else
        csv_data = CSV.generate do |csv|
          csv << %w[id sql normalized_sql duration_ms source_location controller_action request_path occurred_at]
          records.each do |q|
            csv << [q.id, q.sql, q.normalized_sql, q.duration_ms, q.source_location, q.controller_action, q.request_path, q.occurred_at]
          end
        end
        send_data csv_data, filename: "daylight-queries-#{Date.current}.csv", type: "text/csv"
      end
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

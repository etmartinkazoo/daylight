# frozen_string_literal: true

module Daylight
  class RequestsController < BaseController
    include Daylight::TimeSeries
    include Daylight::Exportable

    before_action :ensure_connected

    def index
      period = current_period
      scope = Database::RequestRecord.where("occurred_at > ?", period_start(period))

      # Group by route_pattern (Nightwatch-style: "GET /users/:id")
      # Fall back to controller_action for older records without route_pattern
      group_col = "COALESCE(NULLIF(route_pattern, ''), controller_action)"

      grouped = scope.select(
        "#{group_col} as route",
        "MIN(method) as method",
        "COUNT(*) as total",
        "ROUND(AVG(duration_ms), 1) as avg_duration",
        "ROUND(MAX(duration_ms), 1) as max_duration",
        "SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as ok_count",
        "SUM(CASE WHEN status_code >= 400 AND status_code < 500 THEN 1 ELSE 0 END) as client_error_count",
        "SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as server_error_count",
        "ROUND(AVG(db_duration_ms), 1) as avg_db_duration",
        "ROUND(AVG(query_count), 1) as avg_query_count"
      ).group(group_col).order(Arel.sql(sort_order_sql(
        default: "total",
        allowed: {
          "total" => "total",
          "avg_duration" => "avg_duration",
          "max_duration" => "max_duration",
          "ok_count" => "ok_count",
          "client_error_count" => "client_error_count",
          "server_error_count" => "server_error_count"
        },
        direction: "desc"
      )))

      count = scope.group(group_col).count.length
      pagy, page_rows = pagy(:offset, grouped, count: count, limit: 50)
      routes_on_page = page_rows.map(&:route)

      # Batch-load all durations for routes on this page to compute P95 without N+1
      all_durations = if routes_on_page.any?
        scope
          .where("#{group_col} IN (?)", routes_on_page)
          .pluck(Arel.sql(group_col), :duration_ms)
          .group_by(&:first)
          .transform_values { |pairs| pairs.map(&:last).compact.sort }
      else
        {}
      end

      endpoints = page_rows.map do |row|
        durations = all_durations[row.route] || []
        p95 = durations.any? ? durations[(durations.length * 0.95).ceil - 1] : nil

        {
          route: row.route,
          method: row.method,
          total: row.total,
          avg_duration: row.avg_duration,
          p95_duration: p95&.round(1),
          max_duration: row.max_duration,
          ok_count: row.ok_count,
          client_error_count: row.client_error_count,
          server_error_count: row.server_error_count,
          avg_db_duration: row.avg_db_duration,
          avg_query_count: row.avg_query_count
        }
      end

      # Individual requests for drill-down (fixed top 50, no pagination)
      route_requests = []
      selected_request = nil
      if params[:route].present?
        route_requests = RequestResource.serialize(
          scope.where("#{group_col} = ?", params[:route]).order(occurred_at: :desc).limit(50)
        )

        # Single request detail with linked queries
        if params[:request_id].present?
          req = Database::RequestRecord.find_by(id: params[:request_id])
          if req
            trace_id = req.try(:trace_id)
            queries = QueryRecordResource.serialize(
              Database::QueryRecord.where(request_id: req.id).order(:occurred_at)
            )

            selected_request = RequestResource.serialize(req).merge(
              queries: queries,
              waterfall: TraceWaterfall.new(req).events,
              trace_id: trace_id
            )
          end
        end
      end

      total = scope.count
      minutes_in_period = ((Time.current - period_start(period)) / 60.0)
      throughput_rpm = minutes_in_period > 0 ? (total.to_f / minutes_in_period).round(2) : 0

      apdex = Database::RequestRecord.apdex(scope)

      render inertia: {
        endpoints: InertiaRails.scroll(pagy) { endpoints },
        route_requests: route_requests,
        selected_request: selected_request,
        selected_route: params[:route],
        period: period,
        total_requests: total,
        throughput_rpm: throughput_rpm,
        apdex: apdex,
        latency_series: time_series_avg(scope, period, value_column: :duration_ms),
        throughput_series: time_series_buckets(scope, period),
        deploys: deploys_in_period(period),
        **sort_props
      }
    end

    def export
      records = Database::RequestRecord
        .where("occurred_at > ?", period_start(current_period))
        .order(occurred_at: :desc)

      render_export(
        records,
        filename: "daylight-requests",
        csv_headers: %w[id method path route_pattern controller_action status_code duration_ms db_duration_ms view_duration_ms query_count ip occurred_at],
        json_row: ->(r) { RequestResource.serialize(r) }
      ) { |r| [r.id, r.method, r.path, r.route_pattern, r.controller_action, r.status_code, r.duration_ms, r.db_duration_ms, r.view_duration_ms, r.query_count, r.ip, r.occurred_at] }
    end

    private
  end
end

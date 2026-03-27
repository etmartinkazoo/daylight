# frozen_string_literal: true

require "csv"

module Daylight
  class RequestsController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = params[:period] || "24h"
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

      page = (params[:page] || 1).to_i
      per_page = 50
      grouped = grouped.limit(per_page + 1).offset((page - 1) * per_page)

      endpoints = grouped.map do |row|
        # P95: fetch from individual records for this route
        route_requests = scope.where("#{group_col} = ?", row.route).pluck(:duration_ms).compact.sort
        p95 = route_requests.any? ? route_requests[(route_requests.length * 0.95).ceil - 1] : nil

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

      has_more = endpoints.length > per_page
      endpoints = endpoints.first(per_page)

      # Individual requests for drill-down (when a route is selected)
      route_requests = []
      route_page = (params[:route_page] || 1).to_i
      route_has_more = false
      selected_request = nil
      if params[:route].present?
        route_scope = scope.where("#{group_col} = ?", params[:route])
          .order(occurred_at: :desc)
          .limit(per_page + 1).offset((route_page - 1) * per_page)
        route_requests = route_scope.map { |r| serialize_request(r) }
        route_has_more = route_requests.length > per_page
        route_requests = route_requests.first(per_page)

        # Single request detail with linked queries
        if params[:request_id].present?
          req = Database::RequestRecord.find_by(id: params[:request_id])
          if req
            trace_id = req.try(:trace_id)
            queries = Database::QueryRecord.where(request_id: req.id).order(:occurred_at).map do |q|
              { id: q.id, sql: q.sql, duration_ms: q.duration_ms, source_location: q.source_location }
            end

            waterfall = []
            if trace_id.present?
              # Queries
              Database::QueryRecord.where(trace_id: trace_id).order(:occurred_at).each do |q|
                waterfall << { type: "query", duration_ms: q.duration_ms, detail: q.normalized_sql || q.sql&.truncate(200), source: q.source_location, occurred_at: q.occurred_at }
              end
              # HTTP calls
              Database::HttpRequestRecord.where(trace_id: trace_id).order(:occurred_at).each do |h|
                waterfall << { type: "http", duration_ms: h.duration_ms, detail: "#{h.method} #{h.url&.truncate(200)}", status_code: h.status_code, occurred_at: h.occurred_at }
              end
              # Cache events
              Database::CacheEventRecord.where(trace_id: trace_id).order(:occurred_at).each do |c|
                waterfall << { type: "cache", duration_ms: c.duration_ms, detail: "#{c.event_type} #{c.key&.truncate(100)}", hit: c.hit, occurred_at: c.occurred_at }
              end
              # Logs
              Database::LogRecord.where(trace_id: trace_id).order(:occurred_at).each do |l|
                waterfall << { type: "log", detail: l.message&.truncate(200), level: l.level, occurred_at: l.occurred_at }
              end
              # Exceptions
              Database::OccurrenceRecord.where(trace_id: trace_id).order(:occurred_at).each do |o|
                err = Database::ErrorRecord.find_by(id: o.error_id)
                waterfall << { type: "exception", detail: "#{err&.error_class}: #{err&.message&.truncate(150)}", error_id: o.error_id, occurred_at: o.occurred_at }
              end
              waterfall.sort_by! { |e| e[:occurred_at] }
            end

            selected_request = serialize_request(req).merge(queries: queries, waterfall: waterfall, trace_id: trace_id)
          end
        end
      end

      total = scope.count
      minutes_in_period = ((Time.current - period_start(period)) / 60.0)
      throughput_rpm = minutes_in_period > 0 ? (total.to_f / minutes_in_period).round(2) : 0

      # Apdex calculation (threshold 500ms)
      satisfied = scope.where("duration_ms < 500").count
      tolerating = scope.where("duration_ms >= 500 AND duration_ms < 2000").count
      frustrated = scope.where("duration_ms >= 2000").count
      apdex = total > 0 ? ((satisfied + tolerating * 0.5) / total.to_f).round(3) : 1.0

      render inertia: "daylight/requests/index", props: {
        endpoints: endpoints,
        route_requests: route_requests,
        selected_request: selected_request,
        selected_route: params[:route],
        page: page,
        has_more: has_more,
        route_page: route_page,
        route_has_more: route_has_more,
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
      period = params[:period] || "24h"
      scope = Database::RequestRecord.where("occurred_at > ?", period_start(period))
      records = scope.order(occurred_at: :desc)

      if params[:format] == "json"
        render json: records.map { |r| serialize_request(r) }
      else
        csv_data = CSV.generate do |csv|
          csv << %w[id method path route_pattern controller_action status_code duration_ms db_duration_ms view_duration_ms query_count ip occurred_at]
          records.each do |r|
            csv << [r.id, r.method, r.path, r.route_pattern, r.controller_action, r.status_code, r.duration_ms, r.db_duration_ms, r.view_duration_ms, r.query_count, r.ip, r.occurred_at]
          end
        end
        send_data csv_data, filename: "daylight-requests-#{Date.current}.csv", type: "text/csv"
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

    def serialize_request(r)
      {
        id: r.id,
        method: r.method,
        path: r.path,
        route_pattern: r.route_pattern,
        controller_action: r.controller_action,
        status_code: r.status_code,
        duration_ms: r.duration_ms,
        db_duration_ms: r.db_duration_ms,
        view_duration_ms: r.view_duration_ms,
        query_count: r.query_count,
        ip: r.ip,
        occurred_at: r.occurred_at
      }
    end
  end
end

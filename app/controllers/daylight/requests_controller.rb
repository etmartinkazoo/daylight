# frozen_string_literal: true

module Daylight
  class RequestsController < BaseController
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
      ).group(group_col).order("total DESC").limit(100)

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

      # Individual requests for drill-down (when a route is selected)
      route_requests = []
      selected_request = nil
      if params[:route].present?
        route_scope = scope.where("#{group_col} = ?", params[:route])
          .order(occurred_at: :desc)
          .limit(50)
        route_requests = route_scope.map { |r| serialize_request(r) }

        # Single request detail with linked queries
        if params[:request_id].present?
          req = Database::RequestRecord.find_by(id: params[:request_id])
          if req
            queries = Database::QueryRecord.where(request_id: req.id).order(:occurred_at).map do |q|
              { id: q.id, sql: q.sql, duration_ms: q.duration_ms, source_location: q.source_location }
            end
            selected_request = serialize_request(req).merge(queries: queries)
          end
        end
      end

      render inertia: "daylight/requests", props: {
        endpoints: endpoints,
        route_requests: route_requests,
        selected_request: selected_request,
        selected_route: params[:route],
        period: period,
        total_requests: scope.count
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

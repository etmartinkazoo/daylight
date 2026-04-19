# frozen_string_literal: true

module Daylight
  class RequestsController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = current_period
      start = period_start(period)
      scope = Database::RequestRecord.where(occurred_at: start..)

      grouped = scope.grouped_by_route.order(sort_order_sql(
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
      ))

      count = scope.group(Database::RequestRecord::ROUTE_GROUP_EXPR).count.length
      @pagination, page_rows = paginate(grouped, count: count, limit: 20)
      routes_on_page = page_rows.map(&:route)

      p95s = Database::RequestRecord.p95_by_route(scope, routes_on_page)

      endpoints = page_rows.map do |row|
        {
          route: row.route,
          method: row.method,
          total: row.total,
          avg_duration: row.avg_duration,
          p95_duration: p95s[row.route],
          max_duration: row.max_duration,
          ok_count: row.ok_count,
          client_error_count: row.client_error_count,
          server_error_count: row.server_error_count,
          avg_db_duration: row.avg_db_duration,
          avg_query_count: row.avg_query_count
        }
      end

      @endpoints = endpoints
      @route_requests = route_requests(scope)
      @selected_request = selected_request
      @selected_route = params[:route]
      @period = period
      @total_requests = scope.count
      @throughput_rpm = Database::RequestRecord.throughput_rpm(scope, since: start)
      @apdex = Database::RequestRecord.apdex(scope)
      @latency_series = time_series_avg(scope, period, value_column: :duration_ms)
      @throughput_series = time_series_buckets(scope, period)
      @deploys = deploys_in_period(period)
      sort_props.each { |k, v| instance_variable_set(:"@#{k}", v) }
    end

    private

    def route_requests(scope)
      return [] unless params[:route].present?

      scope.for_route(params[:route]).order(occurred_at: :desc).limit(50)
    end

    def selected_request
      return unless params[:request_id].present?

      req = Database::RequestRecord.find_by(id: params[:request_id])
      return unless req

      @selected_request_queries = Database::QueryRecord.where(request_id: req.id).order(:occurred_at)
      @selected_request_waterfall = TraceWaterfall.new(req).events
      req
    end
  end
end

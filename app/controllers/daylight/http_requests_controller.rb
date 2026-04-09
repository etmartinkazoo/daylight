# frozen_string_literal: true

module Daylight
  class HttpRequestsController < BaseController
    include Daylight::TimeSeries
    include Daylight::Exportable

    before_action :ensure_connected

    def index
      period = current_period
      scope = Database::HttpRequestRecord.where("occurred_at > ?", period_start(period))

      grouped = scope.group(:host).select(
        "host",
        "COUNT(*) as total",
        "ROUND(AVG(duration_ms), 1) as avg_duration",
        "ROUND(MAX(duration_ms), 1) as max_duration",
        "SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count"
      ).order(Arel.sql("total DESC"))

      count = scope.group(:host).count.length
      pagy, page_rows = pagy(:offset, grouped, count: count, limit: 20)
      hosts = page_rows.map do |row|
        {
          host: row.host,
          total: row.total,
          avg_duration: row.avg_duration,
          max_duration: row.max_duration,
          error_count: row.error_count
        }
      end

      # Individual requests when a host is selected (fixed top 50, no pagination)
      host_requests = []
      if params[:host].present?
        host_requests = HttpRequestResource.serialize(
          scope.where(host: params[:host]).order(occurred_at: :desc).limit(50)
        )
      end

      render inertia: {
        hosts: InertiaRails.scroll(pagy) { hosts },
        host_requests: host_requests,
        selected_host: params[:host],
        period: period,
        total_requests: scope.count,
        volume_series: time_series_buckets(scope, period)
      }
    end

    def export
      scope = Database::HttpRequestRecord.where("occurred_at > ?", period_start(current_period))
      scope = scope.where(host: params[:host]) if params[:host].present?
      records = scope.order(occurred_at: :desc)

      render_export(
        records,
        filename: "daylight-http-requests",
        csv_headers: %w[id method url host status_code duration_ms controller_action request_path occurred_at],
        json_row: ->(r) { HttpRequestResource.serialize(r) }
      ) { |r| [r.id, r.method, r.url, r.host, r.status_code, r.duration_ms, r.controller_action, r.request_path, r.occurred_at] }
    end

    private
  end
end

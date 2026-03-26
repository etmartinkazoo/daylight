# frozen_string_literal: true

require "csv"

module Daylight
  class HttpRequestsController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = params[:period] || "24h"
      scope = Database::HttpRequestRecord.where("occurred_at > ?", period_start(period))

      grouped = scope.group(:host).select(
        "host",
        "COUNT(*) as total",
        "ROUND(AVG(duration_ms), 1) as avg_duration",
        "ROUND(MAX(duration_ms), 1) as max_duration",
        "SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count"
      ).order(Arel.sql("total DESC")).limit(100)

      hosts = grouped.map do |row|
        {
          host: row.host,
          total: row.total,
          avg_duration: row.avg_duration,
          max_duration: row.max_duration,
          error_count: row.error_count
        }
      end

      # Individual requests when a host is selected
      host_requests = []
      if params[:host].present?
        host_requests = scope
          .where(host: params[:host])
          .order(occurred_at: :desc)
          .limit(50)
          .map { |r| serialize_http_request(r) }
      end

      render inertia: "daylight/http_requests", props: {
        hosts: hosts,
        host_requests: host_requests,
        selected_host: params[:host],
        period: period,
        total_requests: scope.count,
        volume_series: time_series_buckets(scope, period)
      }
    end

    def export
      period = params[:period] || "24h"
      scope = Database::HttpRequestRecord.where("occurred_at > ?", period_start(period))
      scope = scope.where(host: params[:host]) if params[:host].present?
      records = scope.order(occurred_at: :desc)

      if params[:format] == "json"
        render json: records.map { |r| serialize_http_request(r) }
      else
        csv_data = CSV.generate do |csv|
          csv << %w[id method url host status_code duration_ms controller_action request_path occurred_at]
          records.each do |r|
            csv << [r.id, r.method, r.url, r.host, r.status_code, r.duration_ms, r.controller_action, r.request_path, r.occurred_at]
          end
        end
        send_data csv_data, filename: "daylight-http-requests-#{Date.current}.csv", type: "text/csv"
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

    def serialize_http_request(r)
      {
        id: r.id,
        method: r.method,
        url: r.url,
        host: r.host,
        status_code: r.status_code,
        duration_ms: r.duration_ms,
        controller_action: r.controller_action,
        request_path: r.request_path,
        occurred_at: r.occurred_at
      }
    end
  end
end

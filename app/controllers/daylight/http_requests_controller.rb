# frozen_string_literal: true

module Daylight
  class HttpRequestsController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = current_period
      scope = Database::HttpRequestRecord.where(occurred_at: period_start(period)..)

      grouped = scope.grouped_by_host

      count = scope.group(:host).count.length
      @pagy, page_rows = pagy(:offset, grouped, count: count, limit: 20)
      hosts = page_rows.map do |row|
        {
          host: row.host,
          total: row.total,
          avg_duration: row.avg_duration,
          max_duration: row.max_duration,
          error_count: row.error_count
        }
      end

      host_requests = if params[:host].present?
        HttpRequestResource.serialize(
          scope.where(host: params[:host]).order(occurred_at: :desc).limit(50)
        )
      else
        []
      end

      @hosts = hosts
      @host_requests = host_requests
      @selected_host = params[:host]
      @period = period
      @total_requests = scope.count
      @volume_series = time_series_buckets(scope, period)
    end

    private
  end
end

# frozen_string_literal: true

module Daylight
  class LogsController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = current_period
      period_scope = Database::LogRecord.where(occurred_at: period_start(period)..)
      scope = params[:level].present? ? period_scope.where(level: params[:level]) : period_scope

      @pagy, log_records = pagy(scope.order(occurred_at: :desc), limit: 20)

      @logs = LogResource.serialize(log_records)
      @counts = period_scope.group(:level).count
      @period = period
      @level = params[:level]
      @total_logs = scope.count
      @volume_series = time_series_buckets(Database::LogRecord, period)
    end

    private
  end
end

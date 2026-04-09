# frozen_string_literal: true

module Daylight
  class LogsController < BaseController
    include Daylight::TimeSeries
    include Daylight::Exportable

    before_action :ensure_connected

    def index
      period = current_period
      scope = Database::LogRecord.where("occurred_at > ?", period_start(period))

      scope = scope.where(level: params[:level]) if params[:level].present?

      counts = Database::LogRecord
        .where("occurred_at > ?", period_start(period))
        .group(:level)
        .count

      pagy, log_records = pagy(scope.order(occurred_at: :desc), limit: 20)

      render inertia: {
        logs: InertiaRails.scroll(pagy) { LogResource.serialize(log_records) },
        counts: counts,
        period: period,
        level: params[:level],
        total_logs: scope.count,
        volume_series: time_series_buckets(Database::LogRecord, period)
      }
    end

    def export
      scope = Database::LogRecord.where("occurred_at > ?", period_start(current_period))
      scope = scope.where(level: params[:level]) if params[:level].present?
      records = scope.order(occurred_at: :desc)

      render_export(
        records,
        filename: "daylight-logs",
        csv_headers: %w[id level message controller_action request_path occurred_at],
        json_row: ->(l) { LogResource.serialize(l) }
      ) { |l| [l.id, l.level, l.message, l.controller_action, l.request_path, l.occurred_at] }
    end

    private
  end
end

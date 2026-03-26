# frozen_string_literal: true

require "csv"

module Daylight
  class LogsController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = params[:period] || "24h"
      scope = Database::LogRecord.where("occurred_at > ?", period_start(period))

      scope = scope.where(level: params[:level]) if params[:level].present?

      counts = Database::LogRecord
        .where("occurred_at > ?", period_start(period))
        .group(:level)
        .count

      page = (params[:page] || 1).to_i
      per_page = 50
      logs = scope.order(occurred_at: :desc).limit(per_page + 1).offset((page - 1) * per_page).map { |l| serialize_log(l) }
      has_more = logs.length > per_page
      logs = logs.first(per_page)

      render inertia: "daylight/logs", props: {
        logs: logs,
        counts: counts,
        period: period,
        level: params[:level],
        page: page,
        has_more: has_more,
        total_logs: scope.count,
        volume_series: time_series_buckets(Database::LogRecord, period)
      }
    end

    def export
      period = params[:period] || "24h"
      scope = Database::LogRecord.where("occurred_at > ?", period_start(period))
      scope = scope.where(level: params[:level]) if params[:level].present?
      records = scope.order(occurred_at: :desc)

      if params[:format] == "json"
        render json: records.map { |l| serialize_log(l) }
      else
        csv_data = CSV.generate do |csv|
          csv << %w[id level message controller_action request_path occurred_at]
          records.each do |l|
            csv << [l.id, l.level, l.message, l.controller_action, l.request_path, l.occurred_at]
          end
        end
        send_data csv_data, filename: "daylight-logs-#{Date.current}.csv", type: "text/csv"
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

    def serialize_log(l)
      {
        id: l.id,
        level: l.level,
        message: l.message,
        controller_action: l.controller_action,
        request_path: l.request_path,
        occurred_at: l.occurred_at
      }
    end
  end
end

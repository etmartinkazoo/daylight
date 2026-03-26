# frozen_string_literal: true

require "csv"

module Daylight
  class ScheduledTasksController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = params[:period] || "24h"
      scope = Database::ScheduledTaskRecord.where("occurred_at > ?", period_start(period))

      grouped = scope.group(:task_class).select(
        "task_class",
        "COUNT(*) as total",
        "SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count",
        "SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count",
        "ROUND(AVG(CASE WHEN status = 'completed' THEN duration_ms END), 1) as avg_duration",
        "ROUND(MAX(duration_ms), 1) as max_duration"
      ).order(Arel.sql(sort_order_sql(
        default: "total",
        allowed: {
          "total" => "total",
          "completed_count" => "completed_count",
          "failed_count" => "failed_count",
          "avg_duration" => "avg_duration",
          "max_duration" => "max_duration"
        },
        direction: "desc"
      )))

      page = (params[:page] || 1).to_i
      per_page = 50
      grouped = grouped.limit(per_page + 1).offset((page - 1) * per_page)

      task_classes = grouped.map do |row|
        {
          task_class: row.task_class,
          total: row.total,
          completed_count: row.completed_count,
          failed_count: row.failed_count,
          avg_duration: row.avg_duration,
          max_duration: row.max_duration
        }
      end

      has_more = task_classes.length > per_page
      task_classes = task_classes.first(per_page)

      failures = scope.where(status: "failed").order(occurred_at: :desc).limit(25).map do |t|
        {
          id: t.id,
          task_class: t.task_class,
          duration_ms: t.duration_ms,
          error_class: t.error_class,
          error_message: t.error_message,
          occurred_at: t.occurred_at
        }
      end

      render inertia: "daylight/scheduled_tasks", props: {
        task_classes: task_classes,
        failures: failures,
        period: period,
        page: page,
        has_more: has_more,
        totals: {
          total: scope.count,
          completed: scope.where(status: "completed").count,
          failed: scope.where(status: "failed").count
        },
        volume_series: time_series_buckets(scope, period),
        failure_series: time_series_buckets(scope.where(status: "failed"), period),
        **sort_props
      }
    end

    def export
      period = params[:period] || "24h"
      scope = Database::ScheduledTaskRecord.where("occurred_at > ?", period_start(period))
      records = scope.order(occurred_at: :desc)

      if params[:format] == "json"
        render json: records.map { |t|
          { id: t.id, task_class: t.task_class, status: t.status, duration_ms: t.duration_ms, error_class: t.error_class, error_message: t.error_message, occurred_at: t.occurred_at }
        }
      else
        csv_data = CSV.generate do |csv|
          csv << %w[id task_class status duration_ms error_class error_message occurred_at]
          records.each do |t|
            csv << [t.id, t.task_class, t.status, t.duration_ms, t.error_class, t.error_message, t.occurred_at]
          end
        end
        send_data csv_data, filename: "daylight-scheduled-tasks-#{Date.current}.csv", type: "text/csv"
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
  end
end

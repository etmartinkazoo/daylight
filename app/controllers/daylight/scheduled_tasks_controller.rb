# frozen_string_literal: true

module Daylight
  class ScheduledTasksController < BaseController
    include Daylight::TimeSeries
    include Daylight::Exportable

    before_action :ensure_connected

    def index
      period = current_period
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

      count = scope.group(:task_class).count.length
      pagy, page_rows = pagy(:offset, grouped, count: count, limit: 50)
      task_classes = page_rows.map do |row|
        {
          task_class: row.task_class,
          total: row.total,
          completed_count: row.completed_count,
          failed_count: row.failed_count,
          avg_duration: row.avg_duration,
          max_duration: row.max_duration
        }
      end

      failures = ScheduledTaskResource.serialize(scope.where(status: "failed").order(occurred_at: :desc).limit(25))

      render inertia: {
        task_classes: InertiaRails.scroll(pagy) { task_classes },
        failures: failures,
        period: period,
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
      records = Database::ScheduledTaskRecord
        .where("occurred_at > ?", period_start(current_period))
        .order(occurred_at: :desc)

      render_export(
        records,
        filename: "daylight-scheduled-tasks",
        csv_headers: %w[id task_class status duration_ms error_class error_message occurred_at],
        json_row: ->(t) { ScheduledTaskResource.serialize(t) }
      ) { |t| [t.id, t.task_class, t.status, t.duration_ms, t.error_class, t.error_message, t.occurred_at] }
    end

    private

  end
end

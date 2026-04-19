# frozen_string_literal: true

module Daylight
  class ScheduledTasksController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = current_period
      scope = Database::ScheduledTaskRecord.where(occurred_at: period_start(period)..)

      grouped = scope.grouped_by_class.order(sort_order_sql(
        default: "total",
        allowed: {
          "total" => "total",
          "completed_count" => "completed_count",
          "failed_count" => "failed_count",
          "avg_duration" => "avg_duration",
          "max_duration" => "max_duration"
        },
        direction: "desc"
      ))

      count = scope.group(:task_class).count.length
      @pagination, page_rows = paginate(grouped, count: count, limit: 20)
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

      @task_classes = task_classes
      @failures = scope.failed.order(occurred_at: :desc).limit(25)
      @period = period
      @totals = {
        total: scope.count,
        completed: scope.completed.count,
        failed: scope.failed.count
      }
      @volume_series = time_series_buckets(scope, period)
      @failure_series = time_series_buckets(scope.failed, period)
      sort_props.each { |k, v| instance_variable_set(:"@#{k}", v) }
    end
  end
end

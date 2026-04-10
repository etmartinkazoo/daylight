# frozen_string_literal: true

module Daylight
  class JobsController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = current_period
      scope = Database::JobRecord.where(occurred_at: period_start(period)..)

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

      count = scope.group(:job_class).count.length
      pagy, page_rows = pagy(:offset, grouped, count: count, limit: 20)
      job_classes = page_rows.map do |row|
        {
          job_class: row.job_class,
          total: row.total,
          completed_count: row.completed_count,
          failed_count: row.failed_count,
          queued_count: row.queued_count,
          avg_duration: row.avg_duration,
          max_duration: row.max_duration
        }
      end

      daylight_failures = JobResource.serialize(scope.failed.order(occurred_at: :desc).limit(50))
      sq = SolidQueueStats.new(daylight_failures: daylight_failures)

      render inertia: {
        job_classes: InertiaRails.scroll(pagy) { job_classes },
        failures: sq.merged_failures,
        period: period,
        totals: {
          total: scope.count,
          completed: scope.completed.count,
          failed: scope.failed.count
        },
        solid_queue: sq.stats,
        volume_series: time_series_buckets(scope, period),
        failure_series: time_series_buckets(scope.failed, period),
        **sort_props
      }
    end
  end
end

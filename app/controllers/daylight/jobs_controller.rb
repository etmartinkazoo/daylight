# frozen_string_literal: true

module Daylight
  class JobsController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def show
      @job = Database::JobRecord.find(params[:id])

      # Find related queries and HTTP requests via trace_id
      if @job.trace_id.present?
        @queries = Database::QueryRecord.where(trace_id: @job.trace_id).order(occurred_at: :asc).limit(50)
        @http_requests = Database::HttpRequestRecord.where(trace_id: @job.trace_id).order(occurred_at: :asc).limit(20)
        @logs = Database::LogRecord.where(trace_id: @job.trace_id).order(occurred_at: :asc).limit(50)
      else
        @queries = Database::QueryRecord.none
        @http_requests = Database::HttpRequestRecord.none
        @logs = Database::LogRecord.none
      end

      # Find related error if the job failed
      if @job.error_class.present?
        @related_error = Database::ErrorRecord.find_by(error_class: @job.error_class)
      end
    end

    def index
      period = current_period
      scope = Database::JobRecord.where(occurred_at: period_start(period)..)

      # Filter by job class if specified
      if params[:job_class].present?
        @job_class_filter = params[:job_class]
        filtered = scope.where(job_class: @job_class_filter).order(occurred_at: :desc)
        @pagination, @executions = paginate(filtered, limit: 50)
        @period = period
        @totals = {
          total: filtered.count,
          completed: filtered.completed.count,
          failed: filtered.failed.count
        }
        @volume_series = time_series_buckets(filtered, period)
        return render :executions
      end

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
      @pagination, page_rows = paginate(grouped, count: count, limit: 20)
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

      daylight_failures = scope.failed.order(occurred_at: :desc).limit(50)
      sq = SolidQueueStats.new(daylight_failures: daylight_failures)

      @job_classes = job_classes
      @failures = sq.merged_failures
      @period = period
      @totals = {
        total: scope.count,
        completed: scope.completed.count,
        failed: scope.failed.count
      }
      @solid_queue = sq.stats
      @volume_series = time_series_buckets(scope, period)
      @failure_series = time_series_buckets(scope.failed, period)
      sort_props.each { |k, v| instance_variable_set(:"@#{k}", v) }
    end
  end
end

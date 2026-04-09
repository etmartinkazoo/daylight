# frozen_string_literal: true

module Daylight
  class JobsController < BaseController
    include Daylight::TimeSeries
    include Daylight::Exportable

    before_action :ensure_connected

    def index
      period = current_period

      # Daylight-tracked jobs (from AS::Notifications)
      scope = Database::JobRecord.where("occurred_at > ?", period_start(period))

      grouped = scope.group(:job_class).select(
        "job_class",
        "COUNT(*) as total",
        "SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count",
        "SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count",
        "SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued_count",
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

      # Daylight-tracked failures (fixed top 50, no pagination)
      ew_failures = JobResource.serialize(scope.where(status: "failed").order(occurred_at: :desc).limit(50))

      # Solid Queue failures (authoritative — catches everything including jobs that fail before AS::N fires)
      sq_failures = []
      sq_stats = nil
      if defined?(SolidQueue)
        begin
          sq_stats = {
            ready: SolidQueue::ReadyExecution.count,
            scheduled: SolidQueue::ScheduledExecution.count,
            failed: SolidQueue::FailedExecution.count,
            claimed: SolidQueue::ClaimedExecution.count,
            processes: SolidQueue::Process.count,
            ready_jobs: SolidQueue::ReadyExecution.order(created_at: :desc).limit(25).map { |e|
              { id: e.id, job_class: e.job&.class_name, queue: e.queue_name, created_at: e.created_at }
            },
            scheduled_jobs: SolidQueue::ScheduledExecution.order(scheduled_at: :asc).limit(25).map { |e|
              { id: e.id, job_class: e.job&.class_name, queue: e.queue_name, scheduled_at: e.scheduled_at }
            },
            claimed_jobs: SolidQueue::ClaimedExecution.order(created_at: :desc).limit(25).map { |e|
              { id: e.id, job_class: e.job&.class_name, queue: e.queue_name, claimed_at: e.created_at, process_id: e.process_id }
            },
            worker_processes: SolidQueue::Process.order(created_at: :desc).map { |p|
              { id: p.id, kind: p.kind, hostname: p.hostname, pid: p.pid, created_at: p.created_at, last_heartbeat_at: p.last_heartbeat_at }
            }
          }

          sq_failures = SolidQueue::FailedExecution
            .order(created_at: :desc)
            .limit(50)
            .map do |f|
              job = f.job
              {
                id: "sq_#{f.id}",
                source: "solid_queue",
                job_class: job&.class_name,
                queue: job&.queue_name,
                error_class: f.error&.dig("exception_class"),
                error_message: f.error&.dig("message")&.truncate(500),
                occurred_at: f.created_at
              }
            end
        rescue StandardError => e
          Rails.logger.debug "[Daylight] Solid Queue query failed: #{e.message}"
        end
      end

      # Merge failures: SQ failures are authoritative, deduplicate by time+class
      all_failures = merge_failures(sq_failures, ew_failures)

      render inertia: {
        job_classes: InertiaRails.scroll(pagy) { job_classes },
        failures: all_failures,
        period: period,
        totals: {
          total: scope.count,
          completed: scope.where(status: "completed").count,
          failed: scope.where(status: "failed").count
        },
        solid_queue: sq_stats,
        volume_series: time_series_buckets(scope, period),
        failure_series: time_series_buckets(scope.where(status: "failed"), period),
        **sort_props
      }
    end

    def export
      records = Database::JobRecord
        .where("occurred_at > ?", period_start(current_period))
        .order(occurred_at: :desc)

      render_export(
        records,
        filename: "daylight-jobs",
        csv_headers: %w[id job_class queue status duration_ms error_class error_message occurred_at],
        json_row: ->(j) { { id: j.id, job_class: j.job_class, queue: j.queue, status: j.status, duration_ms: j.duration_ms, error_class: j.error_class, error_message: j.error_message, occurred_at: j.occurred_at } }
      ) { |j| [j.id, j.job_class, j.queue, j.status, j.duration_ms, j.error_class, j.error_message, j.occurred_at] }
    end

    private

    def merge_failures(sq, ew)
      # Use SQ as primary, add any EW failures not already in SQ
      seen = sq.map { |f| "#{f[:job_class]}:#{f[:occurred_at].to_i / 60}" }.to_set
      merged = sq.dup
      ew.each do |f|
        key = "#{f[:job_class]}:#{f[:occurred_at].to_i / 60}"
        merged << f unless seen.include?(key)
      end
      merged.sort_by { |f| f[:occurred_at] }.reverse.first(50)
    end

  end
end

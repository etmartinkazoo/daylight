# frozen_string_literal: true

module Daylight
  class SolidQueueStats
    def initialize(daylight_failures: [])
      @daylight_failures = daylight_failures
    end

    def available?
      defined?(SolidQueue)
    end

    def stats
      return unless available?

      {
        ready: SolidQueue::ReadyExecution.count,
        scheduled: SolidQueue::ScheduledExecution.count,
        failed: SolidQueue::FailedExecution.count,
        claimed: SolidQueue::ClaimedExecution.count,
        processes: SolidQueue::Process.count,
        ready_jobs: ready_jobs,
        scheduled_jobs: scheduled_jobs,
        claimed_jobs: claimed_jobs,
        worker_processes: worker_processes
      }
    rescue StandardError => e
      Rails.logger.debug "[Daylight] Solid Queue query failed: #{e.message}"
      nil
    end

    def merged_failures
      sq = available? ? sq_failures : []
      merge(sq, @daylight_failures)
    rescue StandardError => e
      Rails.logger.debug "[Daylight] Solid Queue failures query failed: #{e.message}"
      @daylight_failures
    end

    private

    def ready_jobs
      SolidQueue::ReadyExecution.order(created_at: :desc).limit(25).map do |e|
        { id: e.id, job_class: e.job&.class_name, queue: e.queue_name, created_at: e.created_at }
      end
    end

    def scheduled_jobs
      SolidQueue::ScheduledExecution.order(scheduled_at: :asc).limit(25).map do |e|
        { id: e.id, job_class: e.job&.class_name, queue: e.queue_name, scheduled_at: e.scheduled_at }
      end
    end

    def claimed_jobs
      SolidQueue::ClaimedExecution.order(created_at: :desc).limit(25).map do |e|
        { id: e.id, job_class: e.job&.class_name, queue: e.queue_name, claimed_at: e.created_at, process_id: e.process_id }
      end
    end

    def worker_processes
      SolidQueue::Process.order(created_at: :desc).map do |p|
        { id: p.id, kind: p.kind, hostname: p.hostname, pid: p.pid, created_at: p.created_at, last_heartbeat_at: p.last_heartbeat_at }
      end
    end

    def sq_failures
      SolidQueue::FailedExecution.order(created_at: :desc).limit(50).map do |f|
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
    end

    def merge(sq, ew)
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

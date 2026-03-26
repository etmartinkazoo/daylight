# frozen_string_literal: true

module Daylight
  class HealthController < BaseController
    include Daylight::TimeSeries

    def index
      render inertia: "daylight/health", props: {
        system: system_info,
        database: database_info,
        jobs: jobs_info,
        errors: errors_info,
        apdex: compute_apdex,
        error_sparkline: error_sparkline,
        request_sparkline: request_sparkline
      }
    end

    private

    def system_info
      mem = read_proc_status("VmRSS")
      {
        ruby_version: RUBY_VERSION,
        rails_version: Rails::VERSION::STRING,
        environment: Rails.env,
        server_time: Time.current.iso8601,
        boot_time: boot_time,
        uptime: uptime_string,
        memory_mb: mem ? (mem.to_f / 1024).round(1) : nil,
        pid: Process.pid
      }
    end

    def database_info
      info = {}

      # Main app DB
      begin
        conn = ActiveRecord::Base.connection
        info[:adapter] = conn.adapter_name
        if conn.adapter_name.downcase.include?("sqlite")
          db_path = conn.instance_variable_get(:@config)&.dig(:database)
          info[:size_mb] = db_path && File.exist?(db_path) ? (File.size(db_path).to_f / 1_048_576).round(1) : nil
        end
        info[:tables] = conn.tables.size
        info[:connected] = true
      rescue StandardError => e
        info[:connected] = false
        info[:error] = e.message
      end

      # Daylight DB
      begin
        Daylight::Database.ensure_connected!
        ew_conn = Daylight::Database::ErrorRecord.connection
        ew_path = ew_conn.instance_variable_get(:@config)&.dig(:database)
        info[:daylight_size_mb] = ew_path && File.exist?(ew_path) ? (File.size(ew_path).to_f / 1_048_576).round(1) : nil
      rescue StandardError
        # skip
      end

      info
    end

    def jobs_info
      info = { available: false }

      if defined?(SolidQueue)
        info[:available] = true

        begin
          info[:ready] = SolidQueue::ReadyExecution.count
          info[:scheduled] = SolidQueue::ScheduledExecution.count
          info[:failed] = SolidQueue::FailedExecution.count
          info[:claimed] = SolidQueue::ClaimedExecution.count
          info[:blocked] = SolidQueue::BlockedExecution.count if SolidQueue.const_defined?(:BlockedExecution)
          info[:processes] = SolidQueue::Process.count
          info[:recent_failures] = SolidQueue::FailedExecution
            .order(created_at: :desc)
            .limit(10)
            .map do |f|
              job = f.job
              {
                id: f.id,
                job_class: job&.class_name,
                error_class: f.error&.dig("exception_class"),
                error_message: f.error&.dig("message")&.truncate(200),
                failed_at: f.created_at
              }
            end
        rescue StandardError => e
          info[:error] = e.message
        end
      end

      info
    end

    def errors_info
      Daylight::Database.ensure_connected!
      {
        total: Daylight::Database::ErrorRecord.count,
        open: Daylight::Database::ErrorRecord.where(status: "open").count,
        last_24h: Daylight::Database::OccurrenceRecord.where("occurred_at > ?", 24.hours.ago).count,
        last_7d: Daylight::Database::OccurrenceRecord.where("occurred_at > ?", 7.days.ago).count
      }
    rescue StandardError
      { total: 0, open: 0, last_24h: 0, last_7d: 0 }
    end

    def boot_time
      @boot_time ||= if defined?(Rails.application) && Rails.application.respond_to?(:initialized_at)
        Rails.application.initialized_at
      else
        Time.current
      end
    end

    def uptime_string
      secs = (Time.current - boot_time).to_i
      days = secs / 86400
      hours = (secs % 86400) / 3600
      mins = (secs % 3600) / 60
      parts = []
      parts << "#{days}d" if days > 0
      parts << "#{hours}h" if hours > 0
      parts << "#{mins}m" if mins > 0
      parts.empty? ? "< 1m" : parts.join(" ")
    end

    def compute_apdex
      Daylight::Database.ensure_connected!
      scope = Database::RequestRecord.where("occurred_at > ?", 24.hours.ago)
      total = scope.count
      return 1.0 if total == 0

      satisfied = scope.where("duration_ms < 500").count
      tolerating = scope.where("duration_ms >= 500 AND duration_ms < 2000").count
      ((satisfied + tolerating * 0.5) / total.to_f).round(3)
    rescue StandardError
      nil
    end

    def error_sparkline
      Daylight::Database.ensure_connected!
      time_series_buckets(Database::OccurrenceRecord, "24h")
    rescue StandardError
      []
    end

    def request_sparkline
      Daylight::Database.ensure_connected!
      time_series_buckets(Database::RequestRecord, "24h")
    rescue StandardError
      []
    end

    def period_start(period)
      case period
      when "1h"  then 1.hour.ago
      when "24h" then 24.hours.ago
      when "7d"  then 7.days.ago
      when "30d" then 30.days.ago
      else 24.hours.ago
      end
    end

    def read_proc_status(key)
      File.readlines("/proc/self/status").each do |line|
        if line.start_with?(key)
          return line.split(/\s+/)[1]
        end
      end
      nil
    rescue StandardError
      nil
    end
  end
end

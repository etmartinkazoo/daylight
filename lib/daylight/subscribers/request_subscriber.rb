# frozen_string_literal: true

require "digest"

module Daylight
  module Subscribers
    class RequestSubscriber
      def self.attach!
        ActiveSupport::Notifications.subscribe("process_action.action_controller") do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          payload = event.payload

          next if payload[:controller]&.start_with?("Daylight::")

          route_pattern = extract_route_pattern(payload)

          Database.ensure_connected!
          record = Database::RequestRecord.create!(
            method: payload[:method],
            path: payload[:path]&.truncate(500),
            route_pattern: route_pattern,
            controller_action: "#{payload[:controller]}##{payload[:action]}",
            status_code: payload[:status],
            duration_ms: event.duration&.round(2),
            db_duration_ms: payload[:db_runtime]&.round(2) || 0,
            view_duration_ms: payload[:view_runtime]&.round(2) || 0,
            query_count: Thread.current[:daylight_query_count] || 0,
            format: payload[:format],
            ip: payload[:request]&.remote_ip,
            trace_id: Daylight::TraceContext.current,
            occurred_at: Time.current
          )

          # Link queries that were recorded during this request
          query_ids = Thread.current[:daylight_query_ids]
          if query_ids&.any?
            Database::QueryRecord.where(id: query_ids).update_all(request_id: record.id)
          end

          # Link HTTP requests that were recorded during this request
          http_ids = Thread.current[:daylight_http_request_ids]
          if http_ids&.any?
            Database::HttpRequestRecord.where(id: http_ids).update_all(request_id: record.id)
          end
          Thread.current[:daylight_http_request_ids] = []

          # Make request ID available to other subscribers
          Thread.current[:daylight_current_request_id] = record.id

          # Detect N+1 queries
          query_patterns = Thread.current[:daylight_query_patterns]
          if query_patterns&.any? { |_pattern, count| count >= 5 }
            record.update_column(:n_plus_one, true)
          end

          # Performance issue auto-detection
          threshold = (Daylight::Database.get_setting("slow_request_threshold_ms") || "500").to_f
          if event.duration && event.duration > threshold
            detect_performance_issue(route_pattern || payload[:controller], event.duration, threshold, record)
          end

          Thread.current[:daylight_query_count] = 0
          Thread.current[:daylight_query_ids] = []
          Thread.current[:daylight_query_patterns] = Hash.new(0)

          Daylight::TraceContext.clear!
          Daylight::Sampler.clear!
        rescue StandardError => e
          Rails.logger.debug "[Daylight] Request tracking failed: #{e.message}" if defined?(Rails)
        end
      end

      # Build a route pattern like "GET /users/:id" from the request
      def self.extract_route_pattern(payload)
        method = payload[:method]
        path = payload[:path].to_s
        # Replace numeric IDs with :id, UUIDs with :uuid
        pattern = path
          .gsub(%r{/\d+(?=/|$)}, "/:id")
          .gsub(%r{/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}}, "/:uuid")
        "#{method} #{pattern}"
      rescue StandardError
        nil
      end

      def self.detect_performance_issue(route, duration_ms, threshold, request_record)
        fingerprint = Digest::SHA256.hexdigest("perf:#{route}")[0..31]
        now = Time.current

        Database.ensure_connected!
        err = Database::ErrorRecord.find_or_initialize_by(fingerprint: fingerprint)

        if err.new_record?
          err.assign_attributes(
            error_class: "Daylight::SlowEndpoint",
            message: "#{route} exceeded #{threshold.round(0)}ms threshold",
            backtrace_summary: route,
            occurrences_count: 1,
            status: "open",
            severity: "performance",
            source: "auto_detection",
            avg_duration_ms: duration_ms,
            max_duration_ms: duration_ms,
            threshold_exceeded_count: 1,
            first_seen_at: now,
            last_seen_at: now
          )
        else
          err.occurrences_count += 1
          err.last_seen_at = now
          err.threshold_exceeded_count = (err.try(:threshold_exceeded_count) || 0) + 1
          # Running average
          prev_avg = err.try(:avg_duration_ms) || duration_ms
          prev_count = err.threshold_exceeded_count - 1
          err.avg_duration_ms = ((prev_avg * prev_count) + duration_ms) / err.threshold_exceeded_count
          err.max_duration_ms = [err.try(:max_duration_ms) || 0, duration_ms].max
          err.message = "#{route} exceeded #{threshold.round(0)}ms threshold (avg: #{err.avg_duration_ms.round(0)}ms, max: #{err.max_duration_ms.round(0)}ms)"
          err.status = "open" if err.status == "resolved"
        end

        err.save!

        Database::OccurrenceRecord.create!(
          error_id: err.id,
          backtrace: "Duration: #{duration_ms.round(1)}ms\nThreshold: #{threshold.round(0)}ms\nRoute: #{route}",
          context: { duration_ms: duration_ms, threshold: threshold, request_id: request_record.id }.to_json,
          request_url: request_record.path,
          request_method: request_record.method,
          trace_id: Daylight::TraceContext.current,
          occurred_at: now
        )
      rescue StandardError
        # Never break the app
      end
    end
  end
end

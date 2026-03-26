# frozen_string_literal: true

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
            occurred_at: Time.current
          )

          # Link queries that were recorded during this request
          query_ids = Thread.current[:daylight_query_ids]
          if query_ids&.any?
            Database::QueryRecord.where(id: query_ids).update_all(request_id: record.id)
          end

          # Make request ID available to other subscribers
          Thread.current[:daylight_current_request_id] = record.id

          # Detect N+1 queries
          query_patterns = Thread.current[:daylight_query_patterns]
          if query_patterns&.any? { |_pattern, count| count >= 5 }
            record.update_column(:n_plus_one, true)
          end

          Thread.current[:daylight_query_count] = 0
          Thread.current[:daylight_query_ids] = []
          Thread.current[:daylight_query_patterns] = Hash.new(0)
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
    end
  end
end

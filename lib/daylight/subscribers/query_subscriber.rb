# frozen_string_literal: true

module Daylight
  module Subscribers
    class QuerySubscriber
      # Only record queries slower than this threshold (ms)
      SLOW_QUERY_THRESHOLD = 50

      def self.attach!
        ActiveSupport::Notifications.subscribe("sql.active_record") do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          payload = event.payload

          # Skip SCHEMA and internal queries
          next if payload[:name] == "SCHEMA" || payload[:name]&.include?("Daylight")
          next unless payload[:sql].present?

          # Count all queries per request
          Thread.current[:daylight_query_count] = (Thread.current[:daylight_query_count] || 0) + 1

          # Only store slow queries to keep DB small
          duration = event.duration
          next unless duration && duration >= SLOW_QUERY_THRESHOLD

          Database.ensure_connected!
          record = Database::QueryRecord.create!(
            sql: payload[:sql].truncate(2000),
            normalized_sql: normalize_sql(payload[:sql]).truncate(500),
            duration_ms: duration.round(2),
            source_location: extract_source(caller_locations),
            controller_action: Thread.current[:daylight_controller_action],
            request_path: Thread.current[:daylight_request_path],
            occurred_at: Time.current
          )

          # Track query IDs for linking to the parent request
          Thread.current[:daylight_query_ids] ||= []
          Thread.current[:daylight_query_ids] << record.id
        rescue StandardError
          # Never break the app for telemetry
        end
      end

      def self.normalize_sql(sql)
        sql.gsub(/\b\d+\b/, "?")
           .gsub(/'[^']*'/, "?")
           .gsub(/"[^"]*"/, "?")
           .squish
      end

      def self.extract_source(locations)
        return nil unless locations
        app_line = locations.find { |l| l.path.include?("/app/") && !l.path.include?("/gems/") }
        return nil unless app_line
        "#{app_line.path.sub(%r{.*/app/}, "app/")}:#{app_line.lineno}"
      end
    end
  end
end

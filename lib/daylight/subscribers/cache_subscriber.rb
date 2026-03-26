# frozen_string_literal: true

module Daylight
  module Subscribers
    class CacheSubscriber
      EVENTS = {
        "cache_read.active_support" => "read",
        "cache_write.active_support" => "write",
        "cache_delete.active_support" => "delete",
        "cache_exist?.active_support" => "exist"
      }.freeze

      def self.attach!
        EVENTS.each do |event_name, event_type|
          ActiveSupport::Notifications.subscribe(event_name) do |*args|
            event = ActiveSupport::Notifications::Event.new(*args)
            payload = event.payload

            key = payload[:key]&.to_s
            next if key.blank?
            next if key.start_with?("daylight")
            next unless Daylight::Sampler.sample?(:cache)

            hit = payload[:hit] if event_type == "read"

            Database.ensure_connected!
            Database::CacheEventRecord.create!(
              event_type: event_type,
              key: key.truncate(500),
              hit: hit,
              duration_ms: event.duration&.round(2),
              controller_action: Thread.current[:daylight_controller_action],
              request_path: Thread.current[:daylight_request_path],
              trace_id: Daylight::TraceContext.current,
              occurred_at: Time.current
            )
          rescue StandardError
            # Never break the app for telemetry
          end
        end
      end
    end
  end
end

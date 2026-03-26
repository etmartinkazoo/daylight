# frozen_string_literal: true

module Daylight
  module Subscribers
    class LogSubscriber
      # Minimum log level to capture (maps to Logger::Severity)
      # 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR, 4=FATAL, 5=UNKNOWN
      LEVEL_NAMES = %w[debug info warn error fatal unknown].freeze

      def self.attach!
        return unless defined?(Rails) && Rails.logger

        # Insert a custom log subscriber that taps into Rails.logger
        broadcaster = LogBroadcaster.new
        Rails.logger.extend(LogInterceptor)
        Rails.logger.instance_variable_set(:@daylight_broadcaster, broadcaster)
      end

      # Mixin that intercepts log calls on the Rails logger
      module LogInterceptor
        def add(severity, message = nil, progname = nil, &block)
          result = super

          # Resolve the message the same way Logger does
          resolved_message = if message.nil?
            block ? block.call : progname
          else
            message
          end

          broadcaster = instance_variable_get(:@daylight_broadcaster)
          broadcaster&.capture(severity, resolved_message.to_s)

          result
        end
      end

      class LogBroadcaster
        def capture(severity, message)
          min_level = Daylight.configuration.log_capture_level
          return if severity < min_level

          # Skip Daylight's own log messages to avoid loops
          return if message.include?("[Daylight]")

          # Skip blank messages
          return if message.blank?

          level_name = LogSubscriber::LEVEL_NAMES[severity] || "unknown"

          Database.ensure_connected!
          Database::LogRecord.create!(
            level: level_name,
            message: message.truncate(2000),
            controller_action: Thread.current[:daylight_controller_action],
            request_path: Thread.current[:daylight_request_path],
            occurred_at: Time.current
          )
        rescue StandardError
          # Never break the app for telemetry
        end
      end
    end
  end
end

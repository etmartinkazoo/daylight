# frozen_string_literal: true

module Daylight
  module Subscribers
    class MailSubscriber
      def self.attach!
        # Mail delivery
        ActiveSupport::Notifications.subscribe("deliver.action_mailer") do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          payload = event.payload
          next if payload[:mailer]&.start_with?("Daylight")
          next unless Daylight::Sampler.sample?(:mail_events)

          Database.ensure_connected!
          Database::MailEventRecord.create!(
            event_type: "deliver",
            mailer_class: payload[:mailer],
            action_name: payload[:action],
            recipients: Array(payload[:to]).join(", "),
            channel: payload[:channel] || "email",
            subject: payload[:subject]&.truncate(500),
            status: payload[:exception_object] ? "failed" : "delivered",
            duration_ms: event.duration&.round(2),
            error_message: payload[:exception_object]&.message&.truncate(1000),
            trace_id: Daylight::TraceContext.current,
            occurred_at: Time.current
          )
        rescue StandardError
          # Never break the app
        end

        # Mail process (receiving)
        ActiveSupport::Notifications.subscribe("process.action_mailer") do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          payload = event.payload
          next if payload[:mailer]&.start_with?("Daylight")
          next unless Daylight::Sampler.sample?(:mail_events)

          Database.ensure_connected!
          Database::MailEventRecord.create!(
            event_type: "process",
            mailer_class: payload[:mailer],
            action_name: payload[:action],
            recipients: Array(payload[:to]).join(", "),
            channel: payload[:channel] || "email",
            subject: payload[:subject]&.truncate(500),
            status: payload[:exception_object] ? "failed" : "processed",
            duration_ms: event.duration&.round(2),
            error_message: payload[:exception_object]&.message&.truncate(1000),
            trace_id: Daylight::TraceContext.current,
            occurred_at: Time.current
          )
        rescue StandardError
          # Never break the app
        end
      end
    end
  end
end

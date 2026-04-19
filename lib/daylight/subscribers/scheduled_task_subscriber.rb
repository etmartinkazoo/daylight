# frozen_string_literal: true

module Daylight
  module Subscribers
    class ScheduledTaskSubscriber
      def self.attach!
        # SolidQueue recurring task
        ActiveSupport::Notifications.subscribe("perform.solid_queue") do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          payload = event.payload
          task_class = payload[:task_class] || payload[:job_class] || ""
          next if task_class.start_with?("Daylight")
          next unless Daylight::Sampler.sample?(:scheduled_tasks)

          Daylight::TraceContext.start!

          Database.ensure_connected!
          Database::ScheduledTaskRecord.create!(
            task_class: payload[:task_class] || payload[:job_class] || "Unknown",
            command: payload[:command],
            frequency: payload[:frequency],
            status: payload[:exception_object] ? "failed" : "completed",
            duration_ms: event.duration&.round(2),
            error_class: payload[:exception_object]&.class&.name,
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

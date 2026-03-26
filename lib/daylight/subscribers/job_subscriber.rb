# frozen_string_literal: true

module Daylight
  module Subscribers
    class JobSubscriber
      def self.attach!
        # Job enqueued
        ActiveSupport::Notifications.subscribe("enqueue.active_job") do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          job = event.payload[:job]
          next if job.class.name&.start_with?("Daylight")

          Database.ensure_connected!
          Database::JobRecord.create!(
            job_class: job.class.name,
            queue: job.queue_name,
            status: "queued",
            enqueued_at: Time.current,
            occurred_at: Time.current
          )
        rescue StandardError
          # Never break the app
        end

        # Job performed
        ActiveSupport::Notifications.subscribe("perform.active_job") do |*args|
          event = ActiveSupport::Notifications::Event.new(*args)
          job = event.payload[:job]
          exception = event.payload[:exception_object]
          next if job.class.name&.start_with?("Daylight")

          Database.ensure_connected!
          Database::JobRecord.create!(
            job_class: job.class.name,
            queue: job.queue_name,
            status: exception ? "failed" : "completed",
            duration_ms: event.duration&.round(2),
            error_class: exception&.class&.name,
            error_message: exception&.message&.truncate(1000),
            completed_at: Time.current,
            occurred_at: Time.current
          )

          # Link job failures to the errors dashboard
          if exception
            Daylight::Tracker.record(exception, context: {
              handled: false,
              source: "job",
              job_class: job.class.name,
              queue: job.queue_name,
              job_id: job.job_id
            })
          end
        rescue StandardError
          # Never break the app
        end
      end
    end
  end
end

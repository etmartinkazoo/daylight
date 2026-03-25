# frozen_string_literal: true

require "digest"
require "json"

module Daylight
  module Tracker
    class << self
      def record(error, context: {})
        return if ignored?(error)

        Database.ensure_connected!

        fingerprint = generate_fingerprint(error)
        now = Time.current
        backtrace = clean_backtrace(error)

        # Extract request info from context (set by middleware)
        req_url = context.delete(:request_url) || context.delete("request_url")
        req_method = context.delete(:request_method) || context.delete("request_method")

        # Also capture controller/action from thread locals (set by subscriber)
        controller_action = Thread.current[:daylight_controller_action]
        context[:controller_action] = controller_action if controller_action

        err = Database::ErrorRecord.find_or_initialize_by(fingerprint: fingerprint)

        if err.new_record?
          err.assign_attributes(
            error_class: error.class.name,
            message: error.message.truncate(1000),
            backtrace_summary: backtrace.first(10).join("\n"),
            occurrences_count: 1,
            status: "open",
            first_seen_at: now,
            last_seen_at: now
          )
        else
          err.occurrences_count += 1
          err.last_seen_at = now
          err.message = error.message.truncate(1000)
          err.status = "open" if err.status == "resolved"
        end

        err.save!

        Database::OccurrenceRecord.create!(
          error_id: err.id,
          backtrace: backtrace.first(30).join("\n"),
          context: context.to_json,
          request_url: req_url&.to_s&.truncate(2000),
          request_method: req_method,
          occurred_at: now
        )

        err
      rescue StandardError => e
        # Never let error tracking break the app
        Rails.logger.error("[Daylight] Failed to record error: #{e.message}") if defined?(Rails)
        nil
      end

      private

      def generate_fingerprint(error)
        # Fingerprint by class + first meaningful backtrace line + message prefix
        location = clean_backtrace(error).first || "unknown"
        msg_prefix = error.message.to_s.gsub(/\b\d+\b/, "N").truncate(200) # normalize numbers
        Digest::SHA256.hexdigest("#{error.class.name}:#{location}:#{msg_prefix}")[0..31]
      end

      def clean_backtrace(error)
        lines = error.backtrace || []
        app_lines = lines
          .reject { |l| l.include?("/gems/") || l.include?("/ruby/") }
          .map { |l| l.sub(Rails.root.to_s + "/", "") rescue l }

        # If no app lines (error originated in a gem), include the first gem lines
        # plus any app lines further down the stack
        if app_lines.empty?
          all_cleaned = lines.first(15).map do |l|
            l.sub(Rails.root.to_s + "/", "")
              .sub(%r{.*/gems/}, "gems/") rescue l
          end
          return all_cleaned
        end

        app_lines
      end

      def ignored?(error)
        Daylight.configuration.ignored_exceptions.include?(error.class.name)
      end
    end
  end
end

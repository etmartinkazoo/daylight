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

        # Extract user_id from context
        user_id = context[:user_id]&.to_s

        # Extract error classification fields
        handled = context.delete(:handled)
        severity = context.delete(:severity)
        source = context.delete(:source)

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
            severity: severity || "error",
            handled: handled,
            source: source,
            first_seen_at: now,
            last_seen_at: now
          )
        else
          err.occurrences_count += 1
          err.last_seen_at = now
          err.message = error.message.truncate(1000)
          err.status = "open" if err.status == "resolved"
          # Update handled to false if we ever see it unhandled (worst case wins)
          err.handled = false if handled == false
          err.source = source if source.present?
        end

        was_new = err.new_record?
        was_reopened = !err.new_record? && err.status_changed? && err.status == "open"

        err.save!

        occurrence = Database::OccurrenceRecord.create!(
          error_id: err.id,
          backtrace: backtrace.first(30).join("\n"),
          context: safe_json(context),
          request_url: req_url&.to_s&.truncate(2000),
          request_method: req_method,
          user_id: user_id,
          trace_id: TraceContext.current,
          occurred_at: now
        )

        # Link occurrence to current request
        current_request_id = Thread.current[:daylight_current_request_id]
        if current_request_id
          Database::OccurrenceRecord.where(id: occurrence.id).update_all(request_id: current_request_id)
        end

        # Update affected_users_count on the error
        if user_id.present?
          count = Database::OccurrenceRecord.where(error_id: err.id).where.not(user_id: nil).distinct.count(:user_id)
          err.update_column(:affected_users_count, count)
        end

        # Notify on new errors or re-opened errors
        if was_new || was_reopened
          Notifier.notify(err) rescue nil
        end

        # Check for anomalies (rate-limited internally)
        AnomalyDetector.check! rescue nil

        err
      rescue Exception => e # rubocop:disable Lint/RescueException -- must not mask the original error (e.g. SystemStackError from circular context)
        # Never let error tracking break the app
        Rails.logger.error("[Daylight] Failed to record error: #{e.class}: #{e.message}") if defined?(Rails)
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

      def safe_json(hash)
        seen = {}.compare_by_identity
        sanitize = ->(obj) do
          case obj
          when Hash
            return "(circular)" if seen.key?(obj)
            seen[obj] = true
            obj.each_with_object({}) { |(k, v), h| h[k] = sanitize.call(v) }
          when Array
            return "(circular)" if seen.key?(obj)
            seen[obj] = true
            obj.map { |v| sanitize.call(v) }
          else
            obj
          end
        end
        sanitize.call(hash).to_json
      rescue => e
        { "_daylight_serialization_error" => e.message }.to_json
      end

      def ignored?(error)
        Daylight.configuration.ignored_exceptions.include?(error.class.name)
      end
    end
  end
end

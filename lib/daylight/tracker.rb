# frozen_string_literal: true

require "digest"
require "json"

module Daylight
  module Tracker
    # Framework-level noise that should never pollute the error tracker.
    IGNORED_ERRORS = %w[
      ActionController::RoutingError
      AbstractController::ActionNotFound
      ActionController::MethodNotAllowed
      ActionController::UnknownHttpMethod
      ActionController::NotImplemented
      ActionController::UnknownFormat
      ActionController::InvalidAuthenticityToken
      ActionController::InvalidCrossOriginRequest
      ActionDispatch::Http::Parameters::ParseError
      ActionController::BadRequest
      ActionController::ParameterMissing
      ActiveRecord::RecordNotFound
      ActionController::UnknownAction
      ActionDispatch::Http::MimeNegotiation::InvalidType
      Rack::QueryParser::ParameterTypeError
      Rack::QueryParser::InvalidParameterError
      CGI::Session::CookieStore::TamperedWithCookie
    ].map(&:freeze).freeze

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
          err.handled = false if handled == false
          err.source = source if source.present?
        end

        was_new = err.new_record?
        was_reopened = !err.new_record? && err.status_changed? && err.status == "open"

        err.save!

        occurrence = Database::OccurrenceRecord.create!(
          error_id: err.id,
          backtrace: backtrace.first(30).join("\n"),
          context: Sanitizer.sanitize_and_serialize(context),
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

        ActiveSupport::Notifications.instrument("error_recorded.daylight",
                                                error: err, was_new: was_new, was_reopened: was_reopened)

        # Queue new errors for AI investigation
        if was_new && auto_investigate?
          begin
            Database::InvestigationQueueRecord.enqueue(
              subject_type: "error",
              subject_id: err.id,
              title: "#{err.error_class}: #{err.message}".truncate(200)
            )
          rescue StandardError
            # Fire-and-forget: don't break error recording if queue fails
          end
        end

        err
      rescue Exception => e # rubocop:disable Lint/RescueException
        Rails.logger.error("[Daylight] Failed to record error: #{e.class}: #{e.message}") if defined?(Rails)
        nil
      end

      private

      def generate_fingerprint(error)
        # Stable fingerprint — class + normalized message only.
        # Deliberately excludes backtrace line numbers so the fingerprint
        # survives deploys that shift line numbers without changing behavior.
        msg = error.message.to_s.gsub(/\b\d+\b/, "N").truncate(200)
        Digest::SHA256.hexdigest("#{error.class.name}:#{msg}")[0..31]
      end

      def clean_backtrace(error)
        lines = error.backtrace || []
        app_lines = lines
          .reject { |l| l.include?("/gems/") || l.include?("/ruby/") }
          .map { |l| l.sub(Rails.root.to_s + "/", "") rescue l }

        if app_lines.empty?
          return lines.first(15).map do |l|
            l.sub(Rails.root.to_s + "/", "")
             .sub(%r{.*/gems/}, "gems/") rescue l
          end
        end

        app_lines
      end

      def ignored?(error)
        Daylight.configuration.ignored_exceptions.include?(error.class.name) ||
          IGNORED_ERRORS.include?(error.class.name)
      end

      def auto_investigate?
        Daylight::AI.configured? &&
          Database.get_setting("auto_investigate_errors") != "false"
      end
    end
  end
end

# frozen_string_literal: true

require "net/http"
require "json"
require "uri"

module Daylight
  module Notifier
    class << self
      def notify(error_record)
        return unless should_notify?(error_record)

        emails = Database.get_setting("notification_emails")
        webhook_url = Database.get_setting("slack_webhook_url")

        # Rate limit: skip if notified within the last hour
        last_notified = Database.get_setting("last_notified_#{error_record.fingerprint}")
        if last_notified.present?
          return if Time.parse(last_notified) > 1.hour.ago
        end

        send_email(error_record, emails) if emails.present?
        send_slack(error_record, webhook_url) if webhook_url.present?

        Database.set_setting("last_notified_#{error_record.fingerprint}", Time.current.iso8601)
      rescue StandardError => e
        Rails.logger.error("[Daylight] Notifier error: #{e.message}") if defined?(Rails)
        nil
      end

      private

      def should_notify?(error_record)
        # Notify on new errors or re-opened errors
        error_record.occurrences_count == 1 ||
          (error_record.status_previously_changed? && error_record.status == "open")
      rescue StandardError
        false
      end

      def send_email(error_record, emails)
        return unless defined?(ActionMailer)

        recipients = emails.split(",").map(&:strip).reject(&:blank?)
        return if recipients.empty?

        subject = "[Daylight] #{error_record.error_class}: #{error_record.message.truncate(80)}"
        body = <<~TEXT
          Error Class: #{error_record.error_class}
          Message: #{error_record.message}
          Occurrences: #{error_record.occurrences_count}
          First Seen: #{error_record.first_seen_at}
          Last Seen: #{error_record.last_seen_at}
          Status: #{error_record.status}
          Severity: #{error_record.severity}

          Backtrace:
          #{error_record.backtrace_summary}
        TEXT

        ActionMailer::Base.mail(
          to: recipients,
          subject: subject,
          body: body
        ).deliver_now
      rescue StandardError => e
        Rails.logger.error("[Daylight] Email notification error: #{e.message}") if defined?(Rails)
      end

      def send_slack(error_record, webhook_url)
        uri = URI.parse(webhook_url)

        payload = {
          attachments: [
            {
              color: "#ef4444",
              title: "[Daylight] #{error_record.error_class}",
              text: error_record.message.truncate(500),
              fields: [
                { title: "Occurrences", value: error_record.occurrences_count.to_s, short: true },
                { title: "Severity", value: error_record.severity, short: true },
                { title: "Status", value: error_record.status, short: true }
              ],
              ts: Time.current.to_i
            }
          ]
        }

        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = uri.scheme == "https"
        http.open_timeout = 5
        http.read_timeout = 5

        request = Net::HTTP::Post.new(uri.request_uri)
        request["Content-Type"] = "application/json"
        request.body = payload.to_json

        http.request(request)
      rescue StandardError => e
        Rails.logger.error("[Daylight] Slack notification error: #{e.message}") if defined?(Rails)
      end
    end
  end
end

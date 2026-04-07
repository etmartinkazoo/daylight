# frozen_string_literal: true

require "net/http"
require "json"
require "uri"

module Daylight
  module Notifier
    def self.subscribe!
      ActiveSupport::Notifications.subscribe("error_recorded.daylight") do |*, payload|
        next unless payload[:was_new] || payload[:was_reopened]
        Daylight::NotifyErrorJob.perform_later(payload[:error].id)
      end
    end

    class << self
      # Called by NotifyErrorJob — runs in a background worker, off the request path.
      def deliver(error_record)
        # Rate limit: skip if notified within the last hour
        last_notified = Database.get_setting("last_notified_#{error_record.fingerprint}")
        return if last_notified.present? && Time.parse(last_notified) > 1.hour.ago

        emails = Database.get_setting("notification_emails")
        webhook_url = Database.get_setting("slack_webhook_url")

        send_email(error_record, emails) if emails.present?
        send_slack(error_record, webhook_url) if webhook_url.present?

        Database.set_setting("last_notified_#{error_record.fingerprint}", Time.current.iso8601)
      rescue StandardError => e
        Rails.logger.error("[Daylight] Notifier error: #{e.message}") if defined?(Rails)
      end

      # Public entry point for manual/test notifications (runs synchronously).
      def notify(error_record)
        deliver(error_record)
      end

      private

      def send_email(error_record, emails)
        recipients = emails.split(",").map(&:strip).reject(&:blank?)
        return if recipients.empty?

        ErrorMailer.error_occurred(error_record, recipients).deliver_later
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

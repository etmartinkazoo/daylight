# frozen_string_literal: true

module Daylight
  module Settings
    class NotificationTestsController < Daylight::SettingsController
      def create
        fake_error = Database::ErrorRecord.new(
          fingerprint: "test_notification_#{Time.current.to_i}",
          error_class: "Daylight::TestError",
          message: "This is a test notification from Daylight",
          backtrace_summary: "app/test.rb:1:in `test'",
          occurrences_count: 1,
          status: "open",
          severity: "error",
          first_seen_at: Time.current,
          last_seen_at: Time.current
        )

        Daylight::Notifier.notify(fake_error)
        flash[:success] = "Test notification sent"
        redirect_to settings_path
      rescue StandardError => e
        flash[:error] = "Test notification failed: #{e.message}"
        redirect_to settings_path
      end
    end
  end
end

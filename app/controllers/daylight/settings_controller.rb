# frozen_string_literal: true

module Daylight
  class SettingsController < BaseController
    before_action :ensure_connected

    def index
      settings = Database.all_settings

      render inertia: "daylight/settings", props: {
        settings: {
          github_repo_url: settings["github_repo_url"] || "",
          github_default_branch: settings["github_default_branch"] || "main",
          notification_emails: settings["notification_emails"] || "",
          slack_webhook_url: settings["slack_webhook_url"] || "",
          slow_request_threshold_ms: settings["slow_request_threshold_ms"] || "500",
          slow_query_threshold_ms: settings["slow_query_threshold_ms"] || "50",
          retention_days: settings["retention_days"] || "30",
          sample_rate: settings["sample_rate"] || "1.0",
          ai_context_notes: settings["ai_context_notes"] || "",
          gemini_api_key: settings["gemini_api_key"].present? ? "••••••••" : "",
          gemini_api_key_saved_at: settings["gemini_api_key_saved_at"]
        }
      }
    end

    def update
      allowed_keys = %w[
        github_repo_url github_default_branch
        notification_emails slack_webhook_url
        slow_request_threshold_ms slow_query_threshold_ms
        retention_days sample_rate ai_context_notes
        gemini_api_key
      ]

      settings_params = params.require(:settings).permit(*allowed_keys)

      settings_params.each do |key, value|
        next unless allowed_keys.include?(key)
        # Don't overwrite API keys with the masked placeholder
        if key == "gemini_api_key"
          next if value.blank? || value.start_with?("••")
          Database.set_setting(key, value)
          Database.set_setting("gemini_api_key_saved_at", Time.current.iso8601)
          next
        end
        Database.set_setting(key, value)
      end

      flash[:success] = "Settings saved"
      redirect_to settings_path
    end

    def cleanup
      result = Daylight::Cleanup.perform
      flash[:success] = "Cleanup complete: #{result.values.sum} records removed"
      redirect_to settings_path
    end

    def test_notification
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

    private

    def ensure_connected
      Database.ensure_connected!
    end
  end
end

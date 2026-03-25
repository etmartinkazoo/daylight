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
          ai_context_notes: settings["ai_context_notes"] || "",
          gemini_api_key: settings["gemini_api_key"].present? ? "••••••••" : ""
        }
      }
    end

    def update
      allowed_keys = %w[
        github_repo_url github_default_branch
        notification_emails slack_webhook_url
        slow_request_threshold_ms slow_query_threshold_ms
        retention_days ai_context_notes
        gemini_api_key
      ]

      settings_params = params.require(:settings).permit(*allowed_keys)

      settings_params.each do |key, value|
        next unless allowed_keys.include?(key)
        # Don't overwrite API keys with the masked placeholder
        next if key == "gemini_api_key" && (value.blank? || value.start_with?("••"))
        Database.set_setting(key, value)
      end

      flash[:success] = "Settings saved"
      redirect_to settings_path
    end

    private

    def ensure_connected
      Database.ensure_connected!
    end
  end
end

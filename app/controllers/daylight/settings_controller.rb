# frozen_string_literal: true

module Daylight
  class SettingsController < BaseController
    before_action :ensure_connected

    def index
      settings = Database.all_settings

      # Performance scan results
      perf_issues = PerformanceIssueResource.serialize(
        Database::PerformanceIssueRecord.where(status: "open").order(detected_at: :desc).limit(25)
      )

      # Security scan results
      sec_issues = SecurityIssueResource.serialize(
        Database::SecurityIssueRecord
          .where(status: "open")
          .by_severity
          .limit(50)
      )

      @settings = {
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
        gemini_api_key_saved_at: settings["gemini_api_key_saved_at"],
        anthropic_api_key: settings["anthropic_api_key"].present? ? "••••••••" : "",
        anthropic_api_key_saved_at: settings["anthropic_api_key_saved_at"],
        default_ai_model: settings["default_ai_model"] || "gemini-2.5-flash",
        github_api_token: settings["github_api_token"].present? ? "••••••••" : "",
        github_api_token_saved_at: settings["github_api_token_saved_at"],
        solutions_scan_enabled: settings["solutions_scan_enabled"] || "false",
        performance_scan_enabled: settings["performance_scan_enabled"] || "false",
        performance_scan_interval: settings["performance_scan_interval"] || "daily",
        last_performance_scan_at: settings["last_performance_scan_at"],
        last_performance_scan_count: settings["last_performance_scan_count"],
        last_performance_scan_error: settings["last_performance_scan_error"],
        security_scan_enabled: settings["security_scan_enabled"] || "false",
        security_scan_interval: settings["security_scan_interval"] || "daily",
        security_scan_min_confidence: settings["security_scan_min_confidence"] || "1",
        last_security_scan_at: settings["last_security_scan_at"],
        last_security_scan_count: settings["last_security_scan_count"],
        last_security_scan_total_warnings: settings["last_security_scan_total_warnings"],
        last_security_scan_error: settings["last_security_scan_error"],
        bullet_diagnostic_expires_at: settings["bullet_diagnostic_expires_at"],
        bullet_diagnostic_active: Database.bullet_diagnostic_active?
      }
      @performance_issues = perf_issues
      @security_issues = sec_issues
    end

    def update
      allowed_keys = %w[
        github_repo_url github_default_branch
        notification_emails slack_webhook_url
        slow_request_threshold_ms slow_query_threshold_ms
        retention_days sample_rate ai_context_notes
        gemini_api_key anthropic_api_key default_ai_model
        github_api_token
        performance_scan_enabled performance_scan_interval
        security_scan_enabled security_scan_interval security_scan_min_confidence
        solutions_scan_enabled
      ]

      settings_params = params.require(:settings).permit(*allowed_keys)

      settings_params.each do |key, value|
        if (ts_key = Database::SENSITIVE_KEYS[key])
          next if value.blank? || value.start_with?("••")
          Database.set_setting(key, value)
          Database.set_setting(ts_key, Time.current.iso8601)
        else
          Database.set_setting(key, value)
        end
      end

      flash[:success] = "Settings saved"
      redirect_to settings_path
    end

    private
  end
end

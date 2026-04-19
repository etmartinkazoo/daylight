# frozen_string_literal: true

module Daylight
  class SettingsController < BaseController
    before_action :ensure_connected

    def index
      redirect_to settings_general_path
    end

    def general
      @settings = load_settings
      render :general
    end

    def branding
      @settings = load_settings
      render :branding
    end

    def notifications
      @settings = load_settings
      render :notifications
    end

    def performance
      @settings = load_settings
      render :performance
    end

    def ai
      @settings = load_settings
      render :ai
    end

    def scans
      @settings = load_settings
      @performance_issues = Database::PerformanceIssueRecord.where(status: "open").order(detected_at: :desc).limit(25)
      @security_issues    = Database::SecurityIssueRecord.where(status: "open").by_severity.limit(50)
      render :scans
    end

    def update
      settings_params = params.require(:settings).permit(*ALLOWED_KEYS)

      settings_params.each do |key, value|
        if (ts_key = Database::SENSITIVE_KEYS[key])
          next if value.blank? || value.start_with?("••")
          Database.set_setting(key, value)
          Database.set_setting(ts_key, Time.current.iso8601)
        elsif key == "primary_color"
          Database.set_setting(key, Daylight::Color.normalize(value))
        else
          Database.set_setting(key, value)
        end
      end

      flash[:success] = "Settings saved"
      redirect_to(redirect_target)
    end

    private

    ALLOWED_KEYS = %w[
      app_name app_icon app_logo_url primary_color
      github_repo_url github_default_branch
      notification_emails slack_webhook_url
      slow_request_threshold_ms slow_query_threshold_ms
      retention_days sample_rate ai_context_notes
      gemini_api_key anthropic_api_key default_ai_model
      github_api_token
      performance_scan_enabled performance_scan_interval
      security_scan_enabled security_scan_interval security_scan_min_confidence
      solutions_scan_enabled
    ].freeze

    SECTION_PATHS = {
      "general"       => :settings_general_path,
      "branding"      => :settings_branding_path,
      "notifications" => :settings_notifications_path,
      "performance"   => :settings_performance_path,
      "ai"            => :settings_ai_path,
      "scans"         => :settings_scans_path
    }.freeze

    def load_settings
      settings = Database.all_settings
      {
        app_name: settings["app_name"] || "",
        app_icon: settings["app_icon"] || "",
        app_logo_url: settings["app_logo_url"] || "",
        primary_color: settings["primary_color"].presence || Daylight::Color::DEFAULT_PRIMARY,
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
    end

    def redirect_target
      section = params[:section].to_s
      helper = SECTION_PATHS[section]
      helper ? send(helper) : settings_general_path
    end
  end
end

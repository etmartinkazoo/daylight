# frozen_string_literal: true

module Daylight
  class SettingsController < BaseController
    before_action :ensure_connected

    def index
      settings = Database.all_settings

      # Performance scan results
      perf_issues = Database::PerformanceIssueRecord
        .where(status: "open")
        .order(detected_at: :desc)
        .limit(25)
        .map do |i|
          {
            id: i.id,
            issue_type: i.issue_type,
            severity: i.severity,
            title: i.title,
            description: i.description,
            sql_pattern: i.sql_pattern,
            source_location: i.source_location,
            controller_action: i.controller_action,
            occurrences: i.occurrences,
            avg_duration_ms: i.avg_duration_ms,
            max_duration_ms: i.max_duration_ms,
            total_time_ms: i.total_time_ms,
            solution: i.solution,
            status: i.status,
            detected_at: i.detected_at
          }
        end

      # Security scan results
      sec_issues = Database::SecurityIssueRecord
        .where(status: "open")
        .order(Arel.sql("CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, detected_at DESC"))
        .limit(50)
        .map do |i|
          {
            id: i.id,
            issue_type: i.issue_type,
            warning_type: i.warning_type,
            severity: i.severity,
            confidence: i.confidence,
            title: i.title,
            description: i.description,
            file_path: i.file_path,
            line_number: i.line_number,
            code_snippet: i.code_snippet,
            check_name: i.check_name,
            link: i.link,
            fingerprint: i.fingerprint,
            solution: i.solution,
            status: i.status,
            detected_at: i.detected_at
          }
        end

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
          gemini_api_key_saved_at: settings["gemini_api_key_saved_at"],
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
          last_security_scan_error: settings["last_security_scan_error"]
        },
        performance_issues: perf_issues,
        security_issues: sec_issues
      }
    end

    def update
      allowed_keys = %w[
        github_repo_url github_default_branch
        notification_emails slack_webhook_url
        slow_request_threshold_ms slow_query_threshold_ms
        retention_days sample_rate ai_context_notes
        gemini_api_key
        performance_scan_enabled performance_scan_interval
        security_scan_enabled security_scan_interval security_scan_min_confidence
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

    def run_performance_scan
      Daylight::PerformanceScanJob.perform_later
      flash[:success] = "Performance scan started"
      redirect_to settings_path
    rescue StandardError => e
      flash[:error] = "Performance scan failed to start: #{e.message}"
      redirect_to settings_path
    end

    def dismiss_performance_issue
      issue = Database::PerformanceIssueRecord.find(params[:id])
      issue.update!(status: params[:new_status] || "ignored")
      redirect_to settings_path
    rescue StandardError => e
      flash[:error] = "Failed to update issue: #{e.message}"
      redirect_to settings_path
    end

    def run_security_scan
      Daylight::SecurityScanJob.perform_later
      flash[:success] = "Security scan started"
      redirect_to settings_path
    rescue StandardError => e
      flash[:error] = "Security scan failed to start: #{e.message}"
      redirect_to settings_path
    end

    def dismiss_security_issue
      issue = Database::SecurityIssueRecord.find(params[:id])
      issue.update!(status: params[:new_status] || "ignored")
      redirect_to settings_path
    rescue StandardError => e
      flash[:error] = "Failed to update issue: #{e.message}"
      redirect_to settings_path
    end

    private

    def ensure_connected
      Database.ensure_connected!
    end
  end
end

# frozen_string_literal: true

module Daylight
  class BaseController < ActionController::Base
    include InertiaRails::Controller
    include Daylight::Sortable
    include Pagy::Method

    protect_from_forgery with: :exception

    layout "daylight/application"

    rescue_from StandardError, with: :render_daylight_error

    before_action :authenticate_daylight!
    after_action :maybe_enqueue_performance_scan

    inertia_share do
      ew_settings = begin
        Database.ensure_connected!
        Database.all_settings
      rescue StandardError
        {}
      end

      ai_models = begin
        Daylight::AI.available_models.map { |m| { value: m[:id], label: m[:label] } }
      rescue StandardError
        []
      end

      {
        base_path: Daylight::Engine.routes.url_helpers.root_path.chomp("/"),
        ew_settings: {
          github_repo_url: ew_settings["github_repo_url"],
          github_default_branch: ew_settings["github_default_branch"] || "main",
          ai_context_notes: ew_settings["ai_context_notes"]
        },
        aiModels: ai_models,
        defaultAiModel: ew_settings["default_ai_model"].presence || "gemini-2.5-flash"
      }
    end

    private

    def authenticate_daylight!
      creds = daylight_credentials
      return unless creds[:username].present? && creds[:password].present?

      authenticate_or_request_with_http_basic("Daylight") do |u, p|
        ActiveSupport::SecurityUtils.secure_compare(u, creds[:username]) &
          ActiveSupport::SecurityUtils.secure_compare(p, creds[:password])
      end
    end

    def daylight_credentials
      config = Daylight.configuration

      # 1. Explicit config takes priority
      if config.username.present?
        return { username: config.username, password: config.password }
      end

      # 2. Rails encrypted credentials (credentials.yml.enc)
      if defined?(Rails) && Rails.application.respond_to?(:credentials)
        creds = Rails.application.credentials.dig(:daylight)
        if creds.is_a?(Hash)
          return { username: creds[:username]&.to_s, password: creds[:password]&.to_s }
        end
      end

      { username: nil, password: nil }
    end

    def ensure_connected
      Database.ensure_connected!
    end

    def default_period = "24h"

    def current_period
      params[:period].presence || default_period
    end

    def period_start(period)
      case period
      when "1h"  then 1.hour.ago
      when "24h" then 24.hours.ago
      when "7d"  then 7.days.ago
      when "30d" then 30.days.ago
      else 24.hours.ago
      end
    end

    def render_daylight_error(exception)
      raise exception if Rails.env.test?

      Rails.logger.error("[Daylight] #{exception.class}: #{exception.message}\n#{exception.backtrace&.first(10)&.join("\n")}")

      # Render a static error page to avoid triggering inertia_share (which
      # accesses the database and can recurse if the DB is the source of the error).
      render html: <<~HTML.html_safe, status: :internal_server_error, layout: false
        <!DOCTYPE html>
        <html><head><title>Daylight Error</title>
        <style>body{font-family:system-ui,sans-serif;max-width:600px;margin:4rem auto;padding:0 1rem;color:#333}
        h1{font-size:1.25rem}</style>
        </head><body>
        <h1>Daylight encountered an error</h1>
        <p>#{ERB::Util.html_escape(exception.message)}</p>
        <p><a href="#{root_path}">Back to Daylight</a></p>
        </body></html>
      HTML
    rescue StandardError
      render plain: "Daylight error: #{exception.message}", status: :internal_server_error, layout: false
    end

    # Check at most once per minute if scans are due
    def maybe_enqueue_performance_scan
      return unless Rails.cache.write("daylight:scan_check", true, expires_in: 60.seconds, unless_exist: true)

      Daylight::PerformanceScanJob.perform_later if Daylight::PerformanceScanner.due?
      Daylight::SecurityScanJob.perform_later if Daylight::SecurityScanner.due?
      Daylight::SolutionGenerationJob.perform_later if Daylight::SolutionGenerator.due?
    rescue StandardError
      # Never break the app
    end
  end
end

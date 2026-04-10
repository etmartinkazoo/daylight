# frozen_string_literal: true

module Daylight
  class BaseController < ActionController::Base
    include InertiaRails::Controller
    include Daylight::Periodable
    include Daylight::Sortable
    include Pagy::Method

    protect_from_forgery with: :exception

    layout "daylight/application"

    rescue_from StandardError, with: :render_daylight_error

    before_action :authenticate_daylight!

    inertia_share do
      settings = shared_settings
      {
        base_path: Daylight::Engine.routes.url_helpers.root_path.chomp("/"),
        ew_settings: {
          github_repo_url: settings["github_repo_url"],
          github_default_branch: settings["github_default_branch"] || "main",
          ai_context_notes: settings["ai_context_notes"]
        },
        aiModels: shared_ai_models,
        defaultAiModel: settings["default_ai_model"].presence || "gemini-2.5-flash"
      }
    end

    private

    def shared_settings
      Database.ensure_connected!
      Database.all_settings
    rescue StandardError
      {}
    end

    def shared_ai_models
      Daylight::AI.available_models.map { |m| { value: m[:id], label: m[:label] } }
    rescue StandardError
      []
    end

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

      if config.username.present?
        return { username: config.username, password: config.password }
      end

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

    def render_daylight_error(exception)
      raise exception if Rails.env.test?

      Rails.logger.error("[Daylight] #{exception.class}: #{exception.message}\n#{exception.backtrace&.first(10)&.join("\n")}")

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
  end
end

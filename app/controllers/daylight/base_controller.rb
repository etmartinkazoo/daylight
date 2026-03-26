# frozen_string_literal: true

module Daylight
  class BaseController < ActionController::Base
    include InertiaRails::Controller
    include Daylight::Sortable

    layout "daylight/application"

    before_action :authenticate_daylight!

    inertia_share do
      ew_settings = begin
        Database.ensure_connected!
        Database.all_settings
      rescue StandardError
        {}
      end

      {
        base_path: Daylight::Engine.routes.url_helpers.root_path.chomp("/"),
        ew_settings: {
          github_repo_url: ew_settings["github_repo_url"],
          github_default_branch: ew_settings["github_default_branch"] || "main",
          ai_context_notes: ew_settings["ai_context_notes"]
        }
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
  end
end

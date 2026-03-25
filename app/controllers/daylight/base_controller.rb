# frozen_string_literal: true

module Daylight
  class BaseController < ActionController::Base
    include InertiaRails::Controller
    include Daylight::Sortable

    layout "daylight/application"

    inertia_share do
      ew_settings = begin
        Database.ensure_connected!
        Database.all_settings
      rescue StandardError
        {}
      end

      {
        ew_settings: {
          github_repo_url: ew_settings["github_repo_url"],
          github_default_branch: ew_settings["github_default_branch"] || "main",
          ai_context_notes: ew_settings["ai_context_notes"]
        }
      }
    end

    private

    def ensure_connected
      Database.ensure_connected!
    end
  end
end

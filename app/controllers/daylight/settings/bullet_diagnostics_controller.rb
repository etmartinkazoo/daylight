# frozen_string_literal: true

module Daylight
  module Settings
    class BulletDiagnosticsController < Daylight::SettingsController
      def create
        duration = (params[:duration] || "30").to_i.clamp(5, 120)
        expires_at = Time.current + duration.minutes
        Database.set_setting("bullet_diagnostic_expires_at", expires_at.iso8601)
        flash[:success] = "Live N+1 detection enabled for #{duration} minutes (sampling 5% of requests)"
        redirect_to settings_path
      rescue StandardError => e
        flash[:error] = "Failed to start diagnostic: #{e.message}"
        redirect_to settings_path
      end

      def destroy
        Database.set_setting("bullet_diagnostic_expires_at", nil)
        flash[:success] = "Live N+1 detection stopped"
        redirect_to settings_path
      end
    end
  end
end

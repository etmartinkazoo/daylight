# frozen_string_literal: true

module Daylight
  module Settings
    class SecurityScansController < Daylight::SettingsController
      def create
        Daylight::SecurityScanJob.perform_later
        flash[:success] = "Security scan started"
        redirect_to settings_path
      rescue StandardError => e
        flash[:error] = "Security scan failed to start: #{e.message}"
        redirect_to settings_path
      end
    end
  end
end

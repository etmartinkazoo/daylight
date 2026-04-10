# frozen_string_literal: true

module Daylight
  module Settings
    class PerformanceScansController < Daylight::SettingsController
      def create
        Daylight::PerformanceScanJob.perform_later
        flash[:success] = "Performance scan started"
        redirect_to settings_path
      rescue StandardError => e
        flash[:error] = "Performance scan failed to start: #{e.message}"
        redirect_to settings_path
      end
    end
  end
end

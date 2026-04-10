# frozen_string_literal: true

module Daylight
  module Settings
    class CleanupsController < Daylight::SettingsController
      def create
        result = Daylight::Cleanup.perform
        flash[:success] = "Cleanup complete: #{result.values.sum} records removed"
        redirect_to settings_path
      end
    end
  end
end

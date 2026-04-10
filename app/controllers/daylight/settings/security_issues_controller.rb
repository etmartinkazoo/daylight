# frozen_string_literal: true

module Daylight
  module Settings
    class SecurityIssuesController < Daylight::SettingsController
      def update
        issue = Database::SecurityIssueRecord.find(params[:id])
        issue.update!(status: params[:new_status] || "ignored")
        redirect_to settings_path
      rescue StandardError => e
        flash[:error] = "Failed to update issue: #{e.message}"
        redirect_to settings_path
      end
    end
  end
end

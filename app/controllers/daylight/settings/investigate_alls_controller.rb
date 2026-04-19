# frozen_string_literal: true

module Daylight
  module Settings
    class InvestigateAllsController < Daylight::SettingsController
      def create
        uninvestigated = Database::ErrorRecord.where(status: "open", ai_solution: nil).count +
                         Database::IncidentRecord.where(status: "open", investigation: [nil, ""]).count

        if uninvestigated == 0
          flash[:success] = "All errors and incidents have already been investigated"
        elsif !Daylight::AI.configured?
          flash[:error] = "Configure an AI API key first"
        else
          Daylight::InvestigateAllJob.perform_later
          flash[:success] = "Investigating #{uninvestigated} uninvestigated errors and incidents"
        end

        redirect_to settings_ai_path
      end
    end
  end
end

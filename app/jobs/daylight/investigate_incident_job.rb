# frozen_string_literal: true

module Daylight
  class InvestigateIncidentJob < ApplicationJob
    queue_as :default

    def perform(incident_id)
      incident = Database::IncidentRecord.find(incident_id)
      IncidentInvestigator.investigate(incident)
    end
  end
end

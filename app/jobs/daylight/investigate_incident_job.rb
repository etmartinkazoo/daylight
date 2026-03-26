# frozen_string_literal: true

module Daylight
  class InvestigateIncidentJob < ActiveJob::Base
    queue_as :default

    def perform(incident_id)
      Database.ensure_connected!
      incident = Database::IncidentRecord.find(incident_id)
      IncidentInvestigator.investigate(incident)
    rescue StandardError => e
      Rails.logger.error("[Daylight] Incident investigation failed: #{e.message}") if defined?(Rails)
    end
  end
end

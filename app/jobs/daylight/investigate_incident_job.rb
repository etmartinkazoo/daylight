# frozen_string_literal: true

module Daylight
  class InvestigateIncidentJob < ApplicationJob
    queue_as :default

    def perform(incident_id)
      incident = Database::IncidentRecord.find(incident_id)

      # Update queue item status
      queue_item = Database::InvestigationQueueRecord.find_by(subject_type: "incident", subject_id: incident_id)
      queue_item&.start!

      IncidentInvestigator.investigate(incident)

      queue_item&.complete!
    rescue StandardError => e
      queue_item&.fail!(e.message.truncate(500)) rescue nil
      raise
    end
  end
end

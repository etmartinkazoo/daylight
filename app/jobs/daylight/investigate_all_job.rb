# frozen_string_literal: true

module Daylight
  class InvestigateAllJob < ApplicationJob
    queue_as :default

    def perform
      Database.ensure_connected!
      return unless Daylight::AI.configured?

      Database.set_setting("last_investigate_all_at", Time.current.iso8601)

      # Investigate all open errors that haven't been investigated yet
      Database::ErrorRecord
        .where(status: "open")
        .where(ai_solution: nil)
        .order(last_seen_at: :desc)
        .find_each do |error|
          error.update!(ai_solution: "")
          ErrorInvestigator.investigate(error)
        end

      # Investigate all open incidents without an investigation
      Database::IncidentRecord
        .where(status: "open")
        .where(investigation: [nil, ""])
        .order(occurred_at: :desc)
        .find_each do |incident|
          incident.update!(status: "investigating")
          IncidentInvestigator.investigate(incident)
        end
    end
  end
end

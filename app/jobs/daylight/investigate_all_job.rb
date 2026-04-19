# frozen_string_literal: true

module Daylight
  class InvestigateAllJob < ApplicationJob
    queue_as :default

    def perform
      Database.ensure_connected!
      return unless Daylight::AI.configured?

      Database.set_setting("last_investigate_all_at", Time.current.iso8601)

      enqueue_uninvestigated
      process_queue
    end

    private

    def enqueue_uninvestigated
      # Enqueue open errors without an AI solution
      Database::ErrorRecord
        .where(status: "open")
        .where(ai_solution: nil)
        .order(last_seen_at: :desc)
        .each do |error|
          InvestigationQueueRecord.enqueue(
            subject_type: "error",
            subject_id: error.id,
            title: "#{error.error_class}: #{error.message}".truncate(200)
          )
        end

      # Enqueue open incidents without an investigation (skip "new_error" — handled via error)
      Database::IncidentRecord
        .where(status: "open")
        .where(investigation: [nil, ""])
        .where.not(incident_type: "new_error")
        .order(occurred_at: :desc)
        .each do |incident|
          InvestigationQueueRecord.enqueue(
            subject_type: "incident",
            subject_id: incident.id,
            title: incident.title.truncate(200),
            priority: incident.severity == "critical" ? "high" : "normal"
          )
        end

      # For "new_error" incidents, copy the linked error's AI solution
      Database::IncidentRecord
        .where(status: "open", incident_type: "new_error")
        .where(investigation: [nil, ""])
        .where.not(related_error_id: nil)
        .find_each do |incident|
          error = Database::ErrorRecord.find_by(id: incident.related_error_id)
          if error&.ai_solution.present?
            incident.update!(
              investigation: error.ai_solution,
              summary: error.ai_solution.split("\n").reject(&:blank?).first&.truncate(300)
            )
          end
        end
    end

    def process_queue
      # Process high priority first, then normal, then low
      InvestigationQueueRecord
        .pending
        .order(Arel.sql("CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, queued_at ASC"))
        .find_each do |item|
          process_item(item)
        end
    end

    def process_item(item)
      item.start!

      case item.subject_type
      when "error"
        error = Database::ErrorRecord.find_by(id: item.subject_id)
        unless error
          item.fail!("Error record not found")
          return
        end
        error.update!(ai_solution: "")
        ErrorInvestigator.investigate(error)
        item.complete!

      when "incident"
        incident = Database::IncidentRecord.find_by(id: item.subject_id)
        unless incident
          item.fail!("Incident record not found")
          return
        end
        incident.update!(status: "investigating")
        IncidentInvestigator.investigate(incident)
        item.complete!
      end
    rescue StandardError => e
      item.fail!(e.message.truncate(500))
    end
  end
end

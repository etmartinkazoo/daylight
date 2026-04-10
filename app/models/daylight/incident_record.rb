# frozen_string_literal: true

module Daylight
  class IncidentRecord < Record
    self.table_name = "daylight_incidents"

    belongs_to :related_error, class_name: "Daylight::ErrorRecord", optional: true
    belongs_to :related_deploy, class_name: "Daylight::DeployRecord", optional: true

    validates :incident_type, :title, :started_at, :occurred_at, presence: true
    validates :status, inclusion: { in: %w[open investigating resolved false_alarm] }

    extend Database::HasStatusCounts
    count_statuses :open, :investigating, :resolved, :false_alarm

    def resolve!
      update!(status: "resolved", resolved_at: Time.current)
    end

    def reopen!
      update!(status: "open")
    end

    def mark_false_alarm!
      update!(status: "false_alarm")
    end

    def ai_context
      lines = [
        "Incident: #{title}",
        "Type: #{incident_type}",
        "Severity: #{severity}",
        "Status: #{status}",
        "Started: #{started_at}"
      ]
      lines << "Summary: #{summary}" if summary.present?
      lines << "Investigation: #{investigation}" if investigation.present?

      trigger = (JSON.parse(trigger_data) rescue nil)
      if trigger.is_a?(Hash) && trigger.any?
        lines << "\nTrigger Data:"
        trigger.each { |k, v| lines << "  #{k}: #{v}" }
      end

      if (err = related_error)
        lines << "\nRelated Error: #{err.error_class}"
        lines << "Error Message: #{err.message}"
        lines << "Occurrences: #{err.occurrences_count}"
        lines << "Backtrace:\n#{err.backtrace_summary}" if err.backtrace_summary.present?
      end

      lines.join("\n")
    end
  end
end

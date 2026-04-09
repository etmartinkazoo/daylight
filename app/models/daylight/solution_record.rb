# frozen_string_literal: true

module Daylight
  class SolutionRecord < Record
    self.table_name = "daylight_solutions"

    extend Database::HasStatusCounts
    count_statuses :all, :draft, :approved, :pushed, :rejected, total: false

    def approve!
      update!(status: "approved", approved_at: Time.current)
    end

    def source_issue
      case source_type
      when "performance"
        PerformanceIssueRecord.find_by(id: source_issue_id)
      when "security"
        SecurityIssueRecord.find_by(id: source_issue_id)
      end
    end

    def incident
      IncidentRecord.find_by(id: incident_id) if incident_id
    end
  end
end

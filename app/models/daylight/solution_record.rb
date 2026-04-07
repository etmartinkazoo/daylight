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
      if source_type == "performance"
        PerformanceIssueRecord.find_by(id: source_issue_id)
      else
        SecurityIssueRecord.find_by(id: source_issue_id)
      end
    end
  end
end

# frozen_string_literal: true

module Daylight
  class SolutionRecord < Record
    self.table_name = "daylight_solutions"

    has_many :messages, class_name: "Daylight::SolutionMessageRecord", foreign_key: :solution_id, dependent: :destroy
    belongs_to :incident, class_name: "Daylight::IncidentRecord", optional: true

    validates :source_type, :source_issue_id, :title, :severity, :generated_at, presence: true
    validates :status, inclusion: { in: %w[draft approved pushed rejected] }

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
  end
end

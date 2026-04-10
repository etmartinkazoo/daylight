# frozen_string_literal: true

module Daylight
  class PerformanceIssueRecord < Record
    self.table_name = "daylight_performance_issues"

    validates :scan_id, :issue_type, :severity, :title, :detected_at, presence: true
  end
end

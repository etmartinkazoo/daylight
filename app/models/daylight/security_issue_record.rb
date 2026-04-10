# frozen_string_literal: true

module Daylight
  class SecurityIssueRecord < Record
    self.table_name = "daylight_security_issues"

    validates :scan_id, :issue_type, :warning_type, :severity, :title, :detected_at, presence: true

    scope :by_severity, -> {
      order(
        Arel.sql("CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END"),
        detected_at: :desc
      )
    }
  end
end

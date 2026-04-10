# frozen_string_literal: true

module Daylight
  class PerformanceIssueResource < BaseResource
    attributes :id, :scan_id, :issue_type, :severity, :title, :description, :sql_pattern,
               :source_location, :controller_action, :occurrences, :avg_duration_ms,
               :max_duration_ms, :total_time_ms, :solution, :status, :detected_at
  end
end

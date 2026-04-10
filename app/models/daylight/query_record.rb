# frozen_string_literal: true

module Daylight
  class QueryRecord < Record
    self.table_name = "daylight_queries"

    validates :sql, :occurred_at, presence: true

    scope :grouped_by_normalized_sql, -> {
      group(:normalized_sql).select(
        "normalized_sql",
        "COUNT(*) as total",
        "ROUND(AVG(duration_ms), 1) as avg_duration",
        "ROUND(MAX(duration_ms), 1) as max_duration",
        "MIN(source_location) as source_location",
        "MIN(controller_action) as controller_action",
        "MIN(request_path) as request_path"
      )
    }
  end
end

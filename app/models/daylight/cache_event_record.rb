# frozen_string_literal: true

module Daylight
  class CacheEventRecord < Record
    self.table_name = "daylight_cache_events"

    validates :event_type, :occurred_at, presence: true

    def self.key_pattern_expr
      Arel.sql("SUBSTR(key, 1, 100)")
    end

    scope :grouped_by_key_pattern, -> {
      group(key_pattern_expr).select(
        "SUBSTR(key, 1, 100) as key_pattern",
        "COUNT(*) as total",
        "SUM(CASE WHEN event_type = 'read' AND hit = 1 THEN 1 ELSE 0 END) as hits",
        "SUM(CASE WHEN event_type = 'read' THEN 1 ELSE 0 END) as reads",
        "ROUND(AVG(duration_ms), 1) as avg_duration"
      ).order(total: :desc)
    }
  end
end

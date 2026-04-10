# frozen_string_literal: true

module Daylight
  class HttpRequestRecord < Record
    self.table_name = "daylight_http_requests"

    validates :url, :occurred_at, presence: true

    scope :grouped_by_host, -> {
      group(:host).select(
        "host",
        "COUNT(*) as total",
        "ROUND(AVG(duration_ms), 1) as avg_duration",
        "ROUND(MAX(duration_ms), 1) as max_duration",
        "SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count"
      ).order(total: :desc)
    }
  end
end

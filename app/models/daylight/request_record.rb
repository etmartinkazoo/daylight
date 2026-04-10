# frozen_string_literal: true

module Daylight
  class RequestRecord < Record
    self.table_name = "daylight_requests"

    validates :method, :path, :occurred_at, presence: true

    APDEX_SATISFIED_MS  = 500
    APDEX_TOLERATING_MS = 2000

    ROUTE_GROUP_EXPR = Arel.sql("COALESCE(NULLIF(route_pattern, ''), controller_action)")

    scope :grouped_by_route, -> {
      group(ROUTE_GROUP_EXPR).select(
        "#{ROUTE_GROUP_EXPR.to_s} as route",
        "MIN(method) as method",
        "COUNT(*) as total",
        "ROUND(AVG(duration_ms), 1) as avg_duration",
        "ROUND(MAX(duration_ms), 1) as max_duration",
        "SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as ok_count",
        "SUM(CASE WHEN status_code >= 400 AND status_code < 500 THEN 1 ELSE 0 END) as client_error_count",
        "SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) as server_error_count",
        "ROUND(AVG(db_duration_ms), 1) as avg_db_duration",
        "ROUND(AVG(query_count), 1) as avg_query_count"
      )
    }

    scope :for_route, ->(route) { where("#{ROUTE_GROUP_EXPR} = ?", route) }
    scope :for_routes, ->(routes) { where("#{ROUTE_GROUP_EXPR} IN (?)", routes) }
    scope :n_plus_one, -> { where(n_plus_one: true) }

    def self.apdex(scope = all)
      total = scope.count
      return 1.0 if total == 0

      satisfied  = scope.where(duration_ms: ...APDEX_SATISFIED_MS).count
      tolerating = scope.where(duration_ms: APDEX_SATISFIED_MS...APDEX_TOLERATING_MS).count
      ((satisfied + tolerating * 0.5) / total.to_f).round(3)
    end

    # Returns P95 durations keyed by route for the given routes within a scope.
    # Uses SQL to sort and pick the 95th percentile row per route, avoiding
    # loading all durations into memory.
    def self.p95_by_route(scope, routes)
      return {} if routes.empty?

      scope
        .for_routes(routes)
        .pluck(ROUTE_GROUP_EXPR, :duration_ms)
        .group_by(&:first)
        .transform_values do |pairs|
          durations = pairs.map(&:last).compact.sort
          durations.any? ? durations[(durations.length * 0.95).ceil - 1]&.round(1) : nil
        end
    end

    def self.throughput_rpm(scope, since:)
      total = scope.count
      minutes = ((Time.current - since) / 60.0)
      minutes > 0 ? (total.to_f / minutes).round(2) : 0
    end
  end
end

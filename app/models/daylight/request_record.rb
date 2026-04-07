# frozen_string_literal: true

module Daylight
  class RequestRecord < Record
    self.table_name = "daylight_requests"

    APDEX_SATISFIED_MS  = 500
    APDEX_TOLERATING_MS = 2000

    def self.apdex(scope = all)
      total = scope.count
      return 1.0 if total == 0

      satisfied  = scope.where("duration_ms < ?", APDEX_SATISFIED_MS).count
      tolerating = scope.where("duration_ms >= ? AND duration_ms < ?", APDEX_SATISFIED_MS, APDEX_TOLERATING_MS).count
      ((satisfied + tolerating * 0.5) / total.to_f).round(3)
    end
  end
end

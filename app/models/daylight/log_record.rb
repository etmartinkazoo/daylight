# frozen_string_literal: true

module Daylight
  class LogRecord < Record
    self.table_name = "daylight_logs"

    validates :level, :message, :occurred_at, presence: true
  end
end

# frozen_string_literal: true

module Daylight
  class ScheduledTaskRecord < Record
    self.table_name = "daylight_scheduled_tasks"

    validates :task_class, :status, :occurred_at, presence: true

    scope :completed, -> { where(status: "completed") }
    scope :failed,    -> { where(status: "failed") }

    scope :grouped_by_class, -> {
      group(:task_class).select(
        "task_class",
        "COUNT(*) as total",
        "SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count",
        "SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count",
        "ROUND(AVG(CASE WHEN status = 'completed' THEN duration_ms END), 1) as avg_duration",
        "ROUND(MAX(duration_ms), 1) as max_duration"
      )
    }
  end
end

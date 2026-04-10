# frozen_string_literal: true

module Daylight
  class MailEventRecord < Record
    self.table_name = "daylight_mail_events"

    validates :event_type, :mailer_class, :status, :occurred_at, presence: true

    scope :delivered, -> { where(status: "delivered") }
    scope :failed,    -> { where(status: "failed") }

    scope :grouped_by_mailer, -> {
      group(:mailer_class).select(
        "mailer_class",
        "COUNT(*) as total",
        "SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count",
        "SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count",
        "ROUND(AVG(duration_ms), 1) as avg_duration"
      )
    }
  end
end

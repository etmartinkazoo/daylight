# frozen_string_literal: true

module Daylight
  class ErrorRecord < Record
    self.table_name = "daylight_errors"

    has_many :occurrences, class_name: "Daylight::OccurrenceRecord", foreign_key: :error_id, dependent: :destroy

    validates :fingerprint, :error_class, :first_seen_at, :last_seen_at, presence: true
    validates :status, inclusion: { in: %w[open resolved ignored] }

    scope :open,        -> { where(status: "open") }
    scope :resolved,    -> { where(status: "resolved") }
    scope :ignored,     -> { where(status: "ignored") }
    scope :unhandled,   -> { where(handled: false) }
    scope :performance, -> { where(severity: "performance") }
    scope :recent,      ->(since = 24.hours.ago) { where(last_seen_at: since..) }
    scope :for_status,  ->(status) { status == "all" ? all : where(status: status) }
    scope :search,      ->(q) { where("error_class LIKE ? OR message LIKE ?", "%#{q}%", "%#{q}%") }

    def self.status_counts
      {
        open: open.count,
        resolved: resolved.count,
        ignored: ignored.count,
        unhandled: unhandled.count,
        performance: open.performance.count,
        total: count,
        last_24h: recent.count
      }
    end

    def ai_context(recent_occurrences = [])
      lines = [
        "Error: #{error_class}",
        "Message: #{message}",
        "Occurrences: #{occurrences_count}",
        "Status: #{status}",
        "First seen: #{first_seen_at}",
        "Last seen: #{last_seen_at}"
      ]
      lines << "\nBacktrace:\n#{backtrace_summary}" if backtrace_summary.present?

      occ = recent_occurrences.first
      if occ
        lines << "\nLast request: #{occ[:request_method]} #{occ[:request_url]}" if occ[:request_url].present?
        ctx = occ[:context] || {}
        lines << "Route: #{ctx["route"]}" if ctx["route"].present?
        lines << "Controller: #{ctx["controller_action"]}" if ctx["controller_action"].present?
        lines << "Tenant: #{ctx["tenant"]}" if ctx["tenant"].present?
        lines << "User: #{ctx["user_name"]}" if ctx["user_name"].present?
      end

      lines.join("\n")
    end
  end
end

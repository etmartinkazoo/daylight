# frozen_string_literal: true

module Daylight
  class InvestigationQueueRecord < Record
    self.table_name = "daylight_investigation_queue"

    validates :subject_type, inclusion: { in: %w[error incident] }
    validates :status, inclusion: { in: %w[pending investigating completed failed] }
    validates :title, :queued_at, presence: true

    scope :pending,       -> { where(status: "pending") }
    scope :investigating, -> { where(status: "investigating") }
    scope :completed,     -> { where(status: "completed") }
    scope :failed,        -> { where(status: "failed") }
    scope :active,        -> { where(status: %w[pending investigating]) }

    def subject
      case subject_type
      when "error"    then ErrorRecord.find_by(id: subject_id)
      when "incident" then IncidentRecord.find_by(id: subject_id)
      end
    end

    def self.enqueue(subject_type:, subject_id:, title:, priority: "normal")
      find_or_create_by!(subject_type: subject_type, subject_id: subject_id) do |item|
        item.title = title
        item.priority = priority
        item.status = "pending"
        item.queued_at = Time.current
      end
    rescue ActiveRecord::RecordNotUnique
      find_by(subject_type: subject_type, subject_id: subject_id)
    end

    def start!
      update!(status: "investigating", started_at: Time.current)
    end

    def complete!
      update!(status: "completed", completed_at: Time.current)
    end

    def fail!(message)
      update!(status: "failed", error_message: message, completed_at: Time.current)
    end
  end
end

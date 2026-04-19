# frozen_string_literal: true

module Daylight
  class InvestigateErrorJob < ApplicationJob
    queue_as :default

    def perform(error_id)
      error_record = Database::ErrorRecord.find(error_id)

      # Update queue item status
      queue_item = Database::InvestigationQueueRecord.find_by(subject_type: "error", subject_id: error_id)
      queue_item&.start!

      ErrorInvestigator.investigate(error_record)

      queue_item&.complete!
    rescue StandardError => e
      queue_item&.fail!(e.message.truncate(500)) rescue nil
      raise
    end
  end
end

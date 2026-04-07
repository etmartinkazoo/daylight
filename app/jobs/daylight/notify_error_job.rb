# frozen_string_literal: true

module Daylight
  class NotifyErrorJob < ApplicationJob
    queue_as :default

    def perform(error_record_id)
      error_record = Database::ErrorRecord.find_by(id: error_record_id)
      return unless error_record

      Daylight::Notifier.deliver(error_record)
    end
  end
end

# frozen_string_literal: true

module Daylight
  class InvestigateErrorJob < ApplicationJob
    queue_as :default

    def perform(error_id)
      error_record = Database::ErrorRecord.find(error_id)
      ErrorInvestigator.investigate(error_record)
    end
  end
end

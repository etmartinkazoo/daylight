# frozen_string_literal: true

module Daylight
  class SolutionGenerationJob < ActiveJob::Base
    queue_as :default

    def perform
      Database.ensure_connected!
      SolutionGenerator.generate!
    rescue StandardError => e
      Rails.logger.error("[Daylight] Solution generation job failed: #{e.message}") if defined?(Rails)
    end
  end
end

# frozen_string_literal: true

module Daylight
  class PerformanceScanJob < ActiveJob::Base
    queue_as :default

    def perform
      Database.ensure_connected!
      PerformanceScanner.scan!
    rescue StandardError => e
      Rails.logger.error("[Daylight] Performance scan job failed: #{e.message}") if defined?(Rails)
    end
  end
end

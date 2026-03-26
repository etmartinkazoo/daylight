# frozen_string_literal: true

module Daylight
  class SecurityScanJob < ActiveJob::Base
    queue_as :default

    def perform
      Database.ensure_connected!
      SecurityScanner.scan!
    rescue StandardError => e
      Rails.logger.error("[Daylight] Security scan job failed: #{e.message}") if defined?(Rails)
    end
  end
end

# frozen_string_literal: true

module Daylight
  # Checks if any scans are due and enqueues them.
  # Intended to run as a SolidQueue recurring task (every 60s).
  #
  # Add to config/recurring.yml:
  #   daylight_scan_scheduler:
  #     class: Daylight::ScanSchedulerJob
  #     schedule: every minute
  class ScanSchedulerJob < ApplicationJob
    queue_as :default

    def perform
      PerformanceScanJob.perform_later if PerformanceScanner.due?
      SecurityScanJob.perform_later if SecurityScanner.due?
      SolutionGenerationJob.perform_later if SolutionGenerator.due?
    rescue StandardError => e
      Rails.logger.debug("[Daylight] Scan scheduler error: #{e.message}")
    end
  end
end

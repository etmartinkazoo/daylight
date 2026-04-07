# frozen_string_literal: true

module Daylight
  class PerformanceScanJob < ApplicationJob
    queue_as :default

    def perform = PerformanceScanner.scan!
  end
end

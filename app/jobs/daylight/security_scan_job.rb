# frozen_string_literal: true

module Daylight
  class SecurityScanJob < ApplicationJob
    queue_as :default

    def perform = SecurityScanner.scan!
  end
end

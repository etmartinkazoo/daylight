# frozen_string_literal: true

module Daylight
  class ApplicationJob < ActiveJob::Base
    around_perform do |_job, block|
      Database.ensure_connected!
      Thread.current[:daylight_internal_request] = true
      block.call
    ensure
      Thread.current[:daylight_internal_request] = false
    end
  end
end

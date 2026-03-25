# frozen_string_literal: true

require "daylight/version"
require "daylight/configuration"
require "daylight/database"
require "daylight/tracker"
require "daylight/middleware/catcher"
require "daylight/subscribers/request_subscriber"
require "daylight/subscribers/query_subscriber"
require "daylight/subscribers/job_subscriber"
require "daylight/engine/engine" if defined?(Rails)

module Daylight
  class << self
    attr_writer :configuration

    def configuration
      @configuration ||= Configuration.new
    end

    def configure
      yield(configuration)
    end

    def track(error, context: {})
      Tracker.record(error, context: context)
    end

    def track!(error, context: {})
      Tracker.record(error, context: context)
      raise error
    end
  end
end

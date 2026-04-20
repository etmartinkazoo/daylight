# frozen_string_literal: true

require "alba"
require "daylight/version"
require "daylight/configuration"
require "daylight/color"
require "daylight/sanitizer"
require "daylight/database"
require "daylight/tracker"
require "daylight/notifier"
require "daylight/cleanup"
require "daylight/ai"
require "daylight/anomaly_detector"
require "daylight/incident_investigator"
require "daylight/error_investigator"
require "daylight/trace_waterfall"
require "daylight/pagination"
require "daylight/trace_context"
require "daylight/sampler"
require "daylight/middleware/catcher"
require "daylight/subscribers/request_subscriber"
require "daylight/subscribers/query_subscriber"
require "daylight/subscribers/job_subscriber"
require "daylight/subscribers/log_subscriber"
require "daylight/subscribers/http_subscriber"
require "daylight/subscribers/cache_subscriber"
require "daylight/engine" if defined?(Rails)

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

    def deploy!(version:, description: nil, git_sha: nil, deployed_by: nil)
      Database.ensure_connected!
      Database::DeployRecord.create!(
        version: version,
        description: description,
        git_sha: git_sha,
        deployed_by: deployed_by,
        deployed_at: Time.current
      )
    end
  end
end

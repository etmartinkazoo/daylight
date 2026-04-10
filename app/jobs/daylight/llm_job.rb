# frozen_string_literal: true

module Daylight
  # Base class for all LLM-related jobs. Uses async-job adapter for
  # non-blocking I/O — a single process can handle thousands of concurrent
  # AI requests instead of blocking a SolidQueue worker thread per request.
  #
  # Host app must add to Gemfile:
  #   gem "async-job-adapter-active_job"
  class LlmJob < ApplicationJob
    self.queue_adapter = :async_job
    queue_as :default
  end
end

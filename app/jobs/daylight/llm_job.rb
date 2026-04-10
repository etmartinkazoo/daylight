# frozen_string_literal: true

module Daylight
  # Base class for all LLM-related jobs. Prefers async-job adapter for
  # non-blocking I/O — a single process can handle thousands of concurrent
  # AI requests instead of blocking a SolidQueue worker thread per request.
  #
  # Falls back to the app's default adapter if async-job is not installed.
  #
  # To enable async processing, add to your Gemfile:
  #   gem "async-job-adapter-active_job"
  class LlmJob < ApplicationJob
    queue_as :default

    begin
      require "async/job/adapter/active_job"
      self.queue_adapter = :async_job
    rescue LoadError
      # async-job not installed — use the app's default adapter
    end
  end
end

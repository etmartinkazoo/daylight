# frozen_string_literal: true

require "securerandom"

module Daylight
  module TraceContext
    THREAD_KEY = :daylight_trace_id

    class << self
      def start!(trace_id = nil)
        Thread.current[THREAD_KEY] = trace_id || SecureRandom.hex(16)
      end

      def current
        Thread.current[THREAD_KEY]
      end

      def clear!
        Thread.current[THREAD_KEY] = nil
      end
    end
  end
end

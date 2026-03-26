# frozen_string_literal: true

module Daylight
  module Sampler
    THREAD_KEY = :daylight_sampled

    class << self
      def start_request_sampling!
        rate = effective_rate(:requests)
        Thread.current[THREAD_KEY] = rand < rate
      end

      def request_sampled?
        Thread.current[THREAD_KEY] != false
      end

      def sample?(event_type)
        rate = effective_rate(event_type)
        rand < rate
      end

      def clear!
        Thread.current[THREAD_KEY] = nil
      end

      private

      def effective_rate(event_type)
        config = Daylight.configuration
        per_type = config.sample_rates[event_type]
        return per_type if per_type
        config.sample_rate
      end
    end
  end
end

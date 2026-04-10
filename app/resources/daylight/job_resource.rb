# frozen_string_literal: true

module Daylight
  class JobResource < BaseResource
    attributes :id, :job_class, :queue, :status, :duration_ms, :error_class,
               :error_message, :enqueued_at, :completed_at, :trace_id, :occurred_at

    attribute :source do |_j|
      "daylight"
    end
  end
end

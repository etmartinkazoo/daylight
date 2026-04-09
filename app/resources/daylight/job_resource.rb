# frozen_string_literal: true

module Daylight
  class JobResource < BaseResource
    attributes :id, :job_class, :queue, :duration_ms, :error_class,
               :error_message, :occurred_at

    attribute :source do |_j|
      "daylight"
    end
  end
end

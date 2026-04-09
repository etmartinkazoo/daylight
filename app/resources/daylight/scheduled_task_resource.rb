# frozen_string_literal: true

module Daylight
  class ScheduledTaskResource < BaseResource
    attributes :id, :task_class, :duration_ms, :error_class, :error_message, :occurred_at
  end
end

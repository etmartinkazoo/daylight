# frozen_string_literal: true

module Daylight
  class ScheduledTaskResource < BaseResource
    attributes :id, :task_class, :command, :frequency, :status, :duration_ms,
               :error_class, :error_message, :trace_id, :occurred_at
  end
end

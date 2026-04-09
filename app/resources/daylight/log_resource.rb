# frozen_string_literal: true

module Daylight
  class LogResource < BaseResource
    attributes :id, :level, :message, :controller_action, :request_path, :occurred_at
  end
end

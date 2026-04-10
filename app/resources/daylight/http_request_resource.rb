# frozen_string_literal: true

module Daylight
  class HttpRequestResource < BaseResource
    attributes :id, :method, :url, :host, :status_code, :duration_ms,
               :controller_action, :request_path, :trace_id, :request_id, :occurred_at
  end
end

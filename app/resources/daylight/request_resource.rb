# frozen_string_literal: true

module Daylight
  class RequestResource < BaseResource
    attributes :id, :method, :path, :route_pattern, :controller_action,
               :status_code, :duration_ms, :db_duration_ms, :view_duration_ms,
               :query_count, :ip, :occurred_at
  end
end

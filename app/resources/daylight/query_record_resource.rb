# frozen_string_literal: true

module Daylight
  class QueryRecordResource < BaseResource
    attributes :id, :sql, :normalized_sql, :duration_ms, :source_location,
               :controller_action, :request_path, :request_id, :trace_id, :occurred_at
  end
end

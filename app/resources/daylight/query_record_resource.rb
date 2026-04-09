# frozen_string_literal: true

module Daylight
  class QueryRecordResource < BaseResource
    attributes :id, :sql, :duration_ms, :source_location, :controller_action,
               :request_path, :occurred_at

    attribute :normalized_sql do |q|
      q.try(:normalized_sql)
    end
  end
end

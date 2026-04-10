# frozen_string_literal: true

module Daylight
  class OccurrenceResource < BaseResource
    attributes :id, :error_id, :backtrace, :request_url, :request_method,
               :request_id, :trace_id, :user_id

    attribute :context do |o|
      JSON.parse(o.context) rescue {}
    end

    attribute :occurred_at do |o|
      o.occurred_at&.strftime("%b %-d, %Y, %I:%M %p") || ""
    end
  end
end

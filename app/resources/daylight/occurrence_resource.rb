# frozen_string_literal: true

module Daylight
  class OccurrenceResource < BaseResource
    attributes :id, :backtrace, :request_url, :request_method

    attribute :context do |o|
      JSON.parse(o.context) rescue {}
    end

    attribute :occurred_at do |o|
      o.occurred_at&.strftime("%b %-d, %Y, %I:%M %p") || ""
    end
  end
end

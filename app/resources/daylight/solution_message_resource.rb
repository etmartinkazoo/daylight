# frozen_string_literal: true

module Daylight
  class SolutionMessageResource < BaseResource
    attributes :id, :solution_id, :role, :content, :created_at
  end
end

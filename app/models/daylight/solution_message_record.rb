# frozen_string_literal: true

module Daylight
  class SolutionMessageRecord < Record
    self.table_name = "daylight_solution_messages"

    validates :solution_id, :role, :content, presence: true
  end
end

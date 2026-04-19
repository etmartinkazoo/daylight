# frozen_string_literal: true

module Daylight
  class ToolCallRecord < Record
    self.table_name = "daylight_tool_calls"

    acts_as_tool_call message_class: "Daylight::ChatMessageRecord"
  end
end

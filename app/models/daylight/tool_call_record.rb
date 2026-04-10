# frozen_string_literal: true

module Daylight
  class ToolCallRecord < Record
    self.table_name = "daylight_tool_calls"

    acts_as_tool_call

    belongs_to :message, class_name: "Daylight::ChatMessageRecord", foreign_key: :chat_message_id
  end
end

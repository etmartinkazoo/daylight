# frozen_string_literal: true

module Daylight
  class ChatMessageRecord < Record
    self.table_name = "daylight_chat_messages"

    acts_as_message model_class: "Daylight::ModelRecord",
                    chat_class: "Daylight::ChatRecord",
                    tool_call_class: "Daylight::ToolCallRecord"

    belongs_to :chat, class_name: "Daylight::ChatRecord"
    has_many :tool_calls, class_name: "Daylight::ToolCallRecord", foreign_key: :chat_message_id, dependent: :destroy

    validates :role, presence: true
  end
end

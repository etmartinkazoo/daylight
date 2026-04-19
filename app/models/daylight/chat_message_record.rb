# frozen_string_literal: true

module Daylight
  class ChatMessageRecord < Record
    self.table_name = "daylight_chat_messages"

    belongs_to :chat, class_name: "Daylight::ChatRecord"
    has_many :tool_calls, class_name: "Daylight::ToolCallRecord", foreign_key: :chat_message_id, dependent: :destroy

    validates :role, presence: true
  end
end

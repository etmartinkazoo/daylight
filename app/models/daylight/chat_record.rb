# frozen_string_literal: true

module Daylight
  class ChatRecord < Record
    self.table_name = "daylight_chats"

    has_many :messages, class_name: "Daylight::ChatMessageRecord", foreign_key: :chat_id, dependent: :destroy
  end
end

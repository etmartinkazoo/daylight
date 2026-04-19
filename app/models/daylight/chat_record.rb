# frozen_string_literal: true

module Daylight
  class ChatRecord < Record
    self.table_name = "daylight_chats"

    acts_as_chat model_class: "Daylight::ModelRecord",
                 message_class: "Daylight::ChatMessageRecord"

    has_many :messages, class_name: "Daylight::ChatMessageRecord", foreign_key: :chat_id, dependent: :destroy
  end
end

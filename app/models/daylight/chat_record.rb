# frozen_string_literal: true

module Daylight
  class ChatRecord < Record
    self.table_name = "daylight_chats"

    acts_as_chat messages: :messages,
                 message_class: "Daylight::ChatMessageRecord",
                 messages_foreign_key: :chat_id,
                 model: :model,
                 model_class: "Daylight::ModelRecord"
  end
end

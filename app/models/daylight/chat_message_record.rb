# frozen_string_literal: true

module Daylight
  class ChatMessageRecord < Record
    self.table_name = "daylight_chat_messages"

    acts_as_message chat: :chat,
                    chat_class: "Daylight::ChatRecord",
                    chat_foreign_key: :chat_id,
                    tool_calls: :tool_calls,
                    tool_call_class: "Daylight::ToolCallRecord",
                    tool_calls_foreign_key: :chat_message_id,
                    model: :model,
                    model_class: "Daylight::ModelRecord"

    validates :role, presence: true

    # Broadcast completed assistant messages for real-time chat updates
    after_create_commit :broadcast_message, if: -> { role == "assistant" && content.present? }

    private

    def broadcast_message
      return unless defined?(Turbo::StreamsChannel)

      Turbo::StreamsChannel.broadcast_append_to(
        "daylight_chat_#{chat_id}",
        target: "chat_messages_#{chat_id}",
        partial: "daylight/shared/chat_message",
        locals: { message: self }
      )
    rescue StandardError => e
      Rails.logger.debug("[Daylight] Chat broadcast failed: #{e.message}") if defined?(Rails)
    end
  end
end

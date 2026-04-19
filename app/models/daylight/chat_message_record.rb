# frozen_string_literal: true

module Daylight
  class ChatMessageRecord < Record
    self.table_name = "daylight_chat_messages"

    belongs_to :chat, class_name: "Daylight::ChatRecord", foreign_key: :chat_id

    validates :role, presence: true

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

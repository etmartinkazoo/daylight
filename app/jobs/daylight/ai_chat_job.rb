# frozen_string_literal: true

module Daylight
  class AiChatJob < LlmJob

    def perform(chat_id, user_id: "anonymous")
      chat = Database::ChatRecord.find(chat_id)
      stream_target = "daylight:ai_chat:#{user_id}"

      chat.complete do |chunk|
        if chunk.content
          ActionCable.server.broadcast(stream_target, {
            chat_id: chat_id,
            type: "chunk",
            content: chunk.content
          })
        end

        if chunk.tool_call?
          ActionCable.server.broadcast(stream_target, {
            chat_id: chat_id,
            type: "tool_use",
            tool: chunk.tool_call.name,
            message: "Calling #{chunk.tool_call.name}..."
          })
        end
      end

      assistant_message = chat.messages.where(role: "assistant").order(created_at: :desc).first
      ActionCable.server.broadcast(stream_target, {
        chat_id: chat_id,
        type: "complete",
        message: {
          id: assistant_message&.id,
          role: "assistant",
          content: assistant_message&.content,
          created_at: assistant_message&.created_at&.iso8601
        }
      })
    rescue StandardError => e
      ActionCable.server.broadcast(stream_target, {
        chat_id: chat_id,
        type: "error",
        error: e.message
      })
    end
  end
end

# frozen_string_literal: true

module Daylight
  class ContextChatJob < ApplicationJob
    queue_as :default

    def perform(chat_id)
      Database.ensure_connected!
      Daylight::AI.configure!

      chat = Database::ChatRecord.find(chat_id)

      # RubyLLM pattern: complete processes the latest user message,
      # creates an assistant message, calls the API, and persists the response.
      chat.complete
    rescue StandardError => e
      Rails.logger.error("[Daylight] Context chat failed: #{e.message}") if defined?(Rails)
      chat = Database::ChatRecord.find_by(id: chat_id)
      chat&.messages&.create!(role: "assistant", content: "Error: #{e.message}", created_at: Time.current)
    end
  end
end

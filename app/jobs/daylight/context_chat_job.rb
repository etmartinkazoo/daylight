# frozen_string_literal: true

module Daylight
  class ContextChatJob < ApplicationJob
    queue_as :default

    def perform(chat_id)
      Database.ensure_connected!
      Daylight::AI.configure!

      chat = Database::ChatRecord.find(chat_id)

      # RubyLLM docs pattern: chat.complete processes the latest user message,
      # creates an empty assistant message, calls the API, and persists the response.
      chat.complete
    rescue StandardError => e
      Rails.logger.error("[Daylight] Context chat failed: #{e.message}") if defined?(Rails)
      # Save error as assistant message so the user sees it
      chat = Database::ChatRecord.find_by(id: chat_id)
      chat&.add_message(role: :assistant, content: "Error: #{e.message}")
    end
  end
end

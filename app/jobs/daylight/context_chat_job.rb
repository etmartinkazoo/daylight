# frozen_string_literal: true

module Daylight
  class ContextChatJob < ApplicationJob
    queue_as :default

    def perform(chat_id)
      Database.ensure_connected!
      chat = Database::ChatRecord.find(chat_id)
      return unless Daylight::AI.configured?

      Daylight::AI.configure!
      model = chat.model_id || Daylight::AI.default_model

      # Build conversation history for RubyLLM
      llm_chat = RubyLLM.chat(model: model)

      # Add app context as system instruction
      app_context = Database.get_setting("ai_context_notes")
      if app_context.present?
        llm_chat.with_instructions("You are an expert Ruby on Rails debugger helping investigate production issues. App context: #{app_context}")
      else
        llm_chat.with_instructions("You are an expert Ruby on Rails debugger helping investigate production issues.")
      end

      # Replay the conversation history
      messages = chat.messages.order(:created_at)
      last_user_message = nil

      messages.each do |msg|
        if msg.role == "user"
          last_user_message = msg.content
        end
      end

      # Build the full prompt with conversation context
      return unless last_user_message

      conversation_context = messages.map { |m| "#{m.role}: #{m.content}" }.join("\n\n")
      prompt = if messages.size > 2
                 "Here is our conversation so far:\n\n#{conversation_context}\n\nPlease respond to the latest user message."
               else
                 last_user_message
               end

      response = llm_chat.ask(prompt)

      chat.messages.create!(
        role: "assistant",
        content: response.content,
        model_id: model,
        input_tokens: response.input_tokens,
        output_tokens: response.output_tokens,
        created_at: Time.current
      )
    rescue StandardError => e
      Rails.logger.error("[Daylight] Context chat failed: #{e.message}") if defined?(Rails)
      chat = Database::ChatRecord.find_by(id: chat_id)
      chat&.messages&.create!(
        role: "assistant",
        content: "Sorry, I encountered an error: #{e.message}",
        created_at: Time.current
      )
    end
  end
end

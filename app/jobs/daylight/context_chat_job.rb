# frozen_string_literal: true

module Daylight
  class ContextChatJob < ApplicationJob
    queue_as :default

    def perform(chat_id)
      Database.ensure_connected!
      chat = Database::ChatRecord.find(chat_id)
      return unless Daylight::AI.configured?

      model = chat.model_id.presence || Daylight::AI.default_model

      # Build conversation history into a single prompt
      messages = chat.messages.order(:created_at)
      last_user_message = messages.where(role: "user").last&.content
      return unless last_user_message

      # App context as system preamble
      app_context = Database.get_setting("ai_context_notes")
      system_prompt = "You are an expert Ruby on Rails debugger helping investigate production issues."
      system_prompt += " App context: #{app_context}" if app_context.present?

      # Build conversation for the LLM
      llm_chat = Daylight::AI.chat(model: model)
      llm_chat.with_instructions(system_prompt)

      # Replay prior messages as context, then ask the latest
      if messages.size > 2
        conversation = messages.map { |m| "#{m.role == 'user' ? 'User' : 'Assistant'}: #{m.content}" }.join("\n\n")
        prompt = "Here is our conversation so far:\n\n#{conversation}\n\nPlease respond to the latest user message."
      else
        prompt = last_user_message
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

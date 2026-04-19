# frozen_string_literal: true

module Daylight
  class ChatRecord < Record
    self.table_name = "daylight_chats"

    has_many :messages, -> { order(created_at: :asc) },
             class_name: "Daylight::ChatMessageRecord",
             foreign_key: :chat_id,
             dependent: :destroy

    def add_message(role:, content:)
      messages.create!(role: role.to_s, content: content, created_at: Time.current)
    end

    def with_instructions(instructions)
      system_msg = messages.find_by(role: "system")
      if system_msg
        system_msg.update!(content: instructions)
      else
        messages.create!(role: "system", content: instructions, created_at: Time.current)
      end
      self
    end

    # Build an RubyLLM::Chat instance with full conversation history
    def to_llm_chat
      Daylight::AI.configure!
      chat = Daylight::AI.chat(model: Daylight::AI.default_model)

      # Load system instructions
      system_msg = messages.find_by(role: "system")
      chat.with_instructions(system_msg.content) if system_msg

      chat
    end

    # Complete the conversation: call the AI and persist the response
    def complete
      llm = to_llm_chat

      # Build conversation context
      conversation = messages.where.not(role: "system").map do |m|
        "#{m.role == 'user' ? 'User' : 'Assistant'}: #{m.content}"
      end

      last_user = messages.where(role: "user").last
      return unless last_user

      prompt = if conversation.size > 2
                 "Conversation so far:\n\n#{conversation.join("\n\n")}\n\nRespond to the user's latest message."
               else
                 last_user.content
               end

      response = llm.ask(prompt)

      add_message(role: :assistant, content: response.content)
    end
  end
end

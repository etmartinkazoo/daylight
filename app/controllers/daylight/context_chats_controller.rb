# frozen_string_literal: true

module Daylight
  class ContextChatsController < BaseController
    before_action :ensure_connected

    # POST /context_chats - send a message (creates chat if needed)
    def create
      chat = find_or_create_chat
      content = params[:content].to_s.strip
      return redirect_back(fallback_location: root_path) if content.blank?

      # Persist user message
      chat.messages.create!(role: "user", content: content, created_at: Time.current)

      # Run AI response in background
      Daylight::ContextChatJob.perform_later(chat.id)

      redirect_back(fallback_location: root_path)
    end

    # GET /context_chats/messages?context_type=error&context_id=1
    def messages
      chat = Database::ChatRecord.find_by(
        context_type: params[:context_type],
        context_id: params[:context_id]
      )

      if chat
        render partial: "daylight/shared/chat_messages", locals: { chat: chat }
      else
        head :no_content
      end
    end

    private

    def find_or_create_chat
      chat = Database::ChatRecord.find_by(
        context_type: params[:context_type],
        context_id: params[:context_id]
      )

      return chat if chat

      model_id = Daylight::AI.default_model
      chat = Database::ChatRecord.create!(
        model_id: model_id,
        context_type: params[:context_type],
        context_id: params[:context_id]
      )

      # Seed the chat with system context
      seed_context(chat)
      chat
    end

    def seed_context(chat)
      context_text = build_context_text
      return unless context_text.present?

      chat.messages.create!(
        role: "user",
        content: context_text,
        created_at: Time.current
      )

      # Get initial AI response with context
      Daylight::ContextChatJob.perform_later(chat.id)
    end

    def build_context_text
      case params[:context_type]
      when "error"
        error = Database::ErrorRecord.find_by(id: params[:context_id])
        return nil unless error

        text = "I'm looking at this error in our application. Here's the context:\n\n"
        text += error.ai_context
        text += "\n\nPlease acknowledge you understand this error and are ready to help me debug it."
        text
      when "incident"
        incident = Database::IncidentRecord.find_by(id: params[:context_id])
        return nil unless incident

        text = "I'm looking at this incident in our application. Here's the context:\n\n"
        text += incident.ai_context
        text += "\n\nPlease acknowledge you understand this incident and are ready to help me investigate it."
        text
      end
    end
  end
end

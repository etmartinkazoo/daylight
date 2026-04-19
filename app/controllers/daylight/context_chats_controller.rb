# frozen_string_literal: true

module Daylight
  class ContextChatsController < BaseController
    before_action :ensure_connected

    # POST /context_chats - send a message
    def create
      Daylight::AI.configure!
      chat = find_or_create_chat
      content = params[:content].to_s.strip
      return redirect_to(params[:redirect_url] || request.referer || root_path) if content.blank?

      # Persist user message immediately (RubyLLM docs pattern)
      chat.add_message(role: :user, content: content)

      # Process AI response in background
      Daylight::ContextChatJob.perform_later(chat.id)

      redirect_to(params[:redirect_url] || request.referer || root_path)
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
      existing = Database::ChatRecord.find_by(
        context_type: params[:context_type],
        context_id: params[:context_id]
      )
      return existing if existing

      # Follow RubyLLM docs: Chat.create!(model: 'model-name')
      chat = Database::ChatRecord.create!(
        model: Daylight::AI.default_model,
        context_type: params[:context_type],
        context_id: params[:context_id]
      )

      # Set system instructions with error/incident context (RubyLLM docs pattern)
      chat.with_instructions(build_system_prompt(chat))

      chat
    end

    def build_system_prompt(chat)
      parts = ["You are an expert Ruby on Rails debugger. Be concise and specific. Reference file names and line numbers when possible."]

      app_context = Database.get_setting("ai_context_notes")
      parts << "App context: #{app_context}" if app_context.present?

      case chat.context_type
      when "error"
        error = Database::ErrorRecord.find_by(id: chat.context_id)
        if error
          parts << "You are discussing this error:\n#{error.ai_context}"
          parts << "AI Investigation:\n#{error.ai_solution}" if error.ai_solution.present?
        end
      when "incident"
        incident = Database::IncidentRecord.find_by(id: chat.context_id)
        if incident
          parts << "You are discussing this incident:\n#{incident.ai_context}"
          parts << "AI Investigation:\n#{incident.investigation}" if incident.investigation.present?
        end
      end

      parts.join("\n\n")
    end
  end
end

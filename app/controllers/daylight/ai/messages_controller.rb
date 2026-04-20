# frozen_string_literal: true

module Daylight
  module AI
    class MessagesController < Daylight::BaseController
      skip_before_action :verify_authenticity_token
      before_action :ensure_connected

      def create
        chat = Database::ChatRecord.find(params[:chat_id])

        # Persist user message immediately
        chat.messages.create!(
          role: "user",
          content: params[:content],
          created_at: Time.current
        )

        # Process AI response in background
        AiChatJob.perform_later(chat.id, user_id: current_user_id)

        head :accepted
      end

      private

      def current_user_id
        session.id&.to_s || "anonymous"
      end
    end
  end
end

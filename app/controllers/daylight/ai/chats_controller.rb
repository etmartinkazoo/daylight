# frozen_string_literal: true

module Daylight
  module Ai
    class ChatsController < Daylight::BaseController
      skip_before_action :verify_authenticity_token
      before_action :ensure_connected

      def create
        chat = Database::ChatRecord.create!(
          model_id: params[:model_id] || Daylight::AI.default_model,
          provider: params[:provider],
          context_type: params[:context_type],
          context_id: params[:context_id],
          context_url: params[:context_url]
        )

        render json: { id: chat.id, model_id: chat.model_id }
      end

      def show
        chat = Database::ChatRecord.find(params[:id])
        messages = chat.messages.order(:created_at).map do |m|
          {
            id: m.id,
            role: m.role,
            content: m.content,
            created_at: m.created_at&.iso8601,
            tool_calls: m.tool_calls.map { |tc| { id: tc.tool_call_id, name: tc.name, arguments: tc.arguments } }
          }
        end

        render json: { id: chat.id, model_id: chat.model_id, messages: messages }
      end

      def destroy
        chat = Database::ChatRecord.find(params[:id])
        chat.destroy!
        head :no_content
      end
    end
  end
end

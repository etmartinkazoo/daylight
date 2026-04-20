# frozen_string_literal: true

module Daylight
  module AI
    class ProposalsController < Daylight::BaseController
      skip_before_action :verify_authenticity_token
      before_action :ensure_connected

      def create
        prompt = build_prompt
        chat = Daylight::AI.chat(model: params[:model_id])
        response = chat.ask(prompt)

        render json: {
          content: response.content,
          execution_id: SecureRandom.uuid
        }
      rescue StandardError => e
        render json: { error: e.message }, status: :internal_server_error
      end

      def update
        # Approve proposal — for now just acknowledge
        render json: { success: true }
      end

      private

      def build_prompt
        parts = []
        parts << "Output type: #{params[:output_type]}" if params[:output_type].present?
        parts << "Context: #{params[:context_type]} ##{params[:context_id]}" if params[:context_type].present?
        parts << "Chat context:\n#{params[:chat_context]}" if params[:chat_context].present?
        parts << "Instructions: #{params[:extra_prompt]}" if params[:extra_prompt].present?
        parts.join("\n\n")
      end
    end
  end
end

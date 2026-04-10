# frozen_string_literal: true

module Daylight
  module Solutions
    class ChatsController < Daylight::BaseController
      skip_before_action :verify_authenticity_token
      before_action :ensure_connected

      def create
        solution = Database::SolutionRecord.find(params[:solution_id])
        message = params[:message]

        return render(json: { error: "Message required" }, status: :unprocessable_entity) if message.blank?

        model = params[:model].presence
        response = Daylight::SolutionGenerator.refine!(solution.id, message, model: model)
        solution.reload

        render json: {
          message: { role: "assistant", content: response, created_at: Time.current },
          updated_fix: solution.proposed_fix
        }
      rescue StandardError => e
        render json: { error: e.message }, status: :internal_server_error
      end
    end
  end
end

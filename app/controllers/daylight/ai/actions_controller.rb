# frozen_string_literal: true

module Daylight
  module AI
    class ActionsController < Daylight::BaseController
      skip_before_action :verify_authenticity_token
      before_action :ensure_connected

      def create
        action = params[:action_data]
        return render(json: { success: false, error: "No action data" }, status: :unprocessable_entity) unless action

        # Execute the action based on type
        result = execute_action(action)
        render json: result
      rescue StandardError => e
        render json: { success: false, error: e.message }, status: :internal_server_error
      end

      private

      def execute_action(action)
        case action["type"]
        when "resolve_error"
          error = Database::ErrorRecord.find(action["id"])
          error.update!(status: "resolved")
          { success: true, message: "Error resolved" }
        when "ignore_error"
          error = Database::ErrorRecord.find(action["id"])
          error.update!(status: "ignored")
          { success: true, message: "Error ignored" }
        else
          { success: false, error: "Unknown action type: #{action["type"]}" }
        end
      end
    end
  end
end

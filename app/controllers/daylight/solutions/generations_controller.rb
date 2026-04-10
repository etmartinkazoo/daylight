# frozen_string_literal: true

module Daylight
  module Solutions
    class GenerationsController < Daylight::BaseController
      before_action :ensure_connected

      def create
        Daylight::SolutionGenerationJob.perform_later
        flash[:success] = "Solution generation started"
        redirect_to solutions_path
      rescue StandardError => e
        flash[:error] = "Failed: #{e.message}"
        redirect_to solutions_path
      end

      def update
        solution = Database::SolutionRecord.find(params[:solution_id])
        Daylight::SolutionGenerator.regenerate!(solution.id)

        flash[:success] = "Solution regenerated"
        redirect_to solution_path(solution)
      rescue StandardError => e
        flash[:error] = "Regeneration failed: #{e.message}"
        redirect_to solution_path(solution)
      end
    end
  end
end

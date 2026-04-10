# frozen_string_literal: true

module Daylight
  module Solutions
    class PushesController < Daylight::BaseController
      before_action :ensure_connected

      def create
        solution = Database::SolutionRecord.find(params[:solution_id])
        pr_url = Daylight::SolutionGenerator.push_to_github!(solution.id)

        flash[:success] = "PR created: #{pr_url}"
        redirect_to solution_path(solution)
      rescue StandardError => e
        flash[:error] = "Push failed: #{e.message}"
        redirect_to solution_path(solution)
      end
    end
  end
end

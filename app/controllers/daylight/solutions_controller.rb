# frozen_string_literal: true

module Daylight
  class SolutionsController < BaseController
    before_action :ensure_connected

    def index
      status_filter = params[:status] || "all"
      scope = Database::SolutionRecord.order(generated_at: :desc)
      scope = scope.where(status: status_filter) unless status_filter == "all"

      @pagy, solution_records = pagy(scope, limit: 20)

      settings = Database.all_settings

      @solutions = solution_records
      @counts = Database::SolutionRecord.status_counts
      @status = status_filter
      @last_scan_at = settings["last_solutions_scan_at"]
      @last_scan_count = settings["last_solutions_scan_count"]
      @last_scan_error = settings["last_solutions_scan_error"]
      @github_configured = Database.github_configured?
    end

    def show
      solution = Database::SolutionRecord.find(params[:id])

      @solution = solution
      @messages = solution.messages.order(:created_at)
      @source_issue = solution.source_issue
      @github_configured = Database.github_configured?
    end

    def update
      solution = Database::SolutionRecord.find(params[:id])

      case params[:status]
      when "approved" then solution.approve!
      when "rejected", "draft" then solution.update!(status: params[:status])
      else
        flash[:error] = "Invalid status: #{params[:status]}"
      end

      redirect_to solution_path(solution)
    end
  end
end

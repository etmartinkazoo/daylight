# frozen_string_literal: true

module Daylight
  class SolutionsController < BaseController
    before_action :ensure_connected

    def index
      status_filter = params[:status] || "all"
      scope = Database::SolutionRecord.order(generated_at: :desc)
      scope = scope.where(status: status_filter) unless status_filter == "all"

      pagy, solution_records = pagy(scope, limit: 20)

      settings = Database.all_settings

      render inertia: {
        solutions: InertiaRails.scroll(pagy) { SolutionResource.serialize(solution_records) },
        counts: Database::SolutionRecord.status_counts,
        status: status_filter,
        last_scan_at: settings["last_solutions_scan_at"],
        last_scan_count: settings["last_solutions_scan_count"],
        last_scan_error: settings["last_solutions_scan_error"],
        github_configured: Database.github_configured?
      }
    end

    def show
      solution = Database::SolutionRecord.find(params[:id])
      messages = SolutionMessageResource.serialize(
        Database::SolutionMessageRecord.where(solution_id: solution.id).order(:created_at)
      )

      source_issue = solution.source_issue
      serialized_source_issue = if source_issue
        if solution.source_type == "performance"
          PerformanceIssueResource.serialize(source_issue)
        else
          SecurityIssueResource.serialize(source_issue)
        end
      end

      render inertia: {
        solution: SolutionResource.serialize(solution),
        messages: messages,
        source_issue: serialized_source_issue,
        github_configured: Database.github_configured?
      }
    end

    def update
      solution = Database::SolutionRecord.find(params[:id])
      new_status = params[:status]

      if %w[approved rejected draft].include?(new_status)
        case new_status
        when "approved" then solution.approve!
        else                 solution.update!(status: new_status)
        end
      end

      redirect_to solution_path(solution)
    end

    def chat
      solution = Database::SolutionRecord.find(params[:id])
      message = params[:message]

      return render(json: { error: "Message required" }, status: 422) if message.blank?

      model = params[:model].presence
      response = Daylight::SolutionGenerator.refine!(solution.id, message, model: model)
      solution.reload

      render json: {
        message: { role: "assistant", content: response, created_at: Time.current },
        updated_fix: solution.proposed_fix
      }
    rescue StandardError => e
      render json: { error: e.message }, status: 500
    end

    def push
      solution = Database::SolutionRecord.find(params[:id])
      pr_url = Daylight::SolutionGenerator.push_to_github!(solution.id)

      flash[:success] = "PR created: #{pr_url}"
      redirect_to solution_path(solution)
    rescue StandardError => e
      flash[:error] = "Push failed: #{e.message}"
      redirect_to solution_path(solution)
    end

    def generate
      Daylight::SolutionGenerationJob.perform_later
      flash[:success] = "Solution generation started"
      redirect_to solutions_path
    rescue StandardError => e
      flash[:error] = "Failed: #{e.message}"
      redirect_to solutions_path
    end

    def regenerate
      solution = Database::SolutionRecord.find(params[:id])
      Daylight::SolutionGenerator.regenerate!(solution.id)

      flash[:success] = "Solution regenerated"
      redirect_to solution_path(solution)
    rescue StandardError => e
      flash[:error] = "Regeneration failed: #{e.message}"
      redirect_to solution_path(solution)
    end

    private
  end
end

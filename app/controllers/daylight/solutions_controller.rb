# frozen_string_literal: true

module Daylight
  class SolutionsController < BaseController
    before_action :ensure_connected

    def index
      status_filter = params[:status] || "all"
      scope = Database::SolutionRecord.order(generated_at: :desc)
      scope = scope.where(status: status_filter) unless status_filter == "all"

      page = (params[:page] || 1).to_i
      per_page = 25
      all_records = scope.limit(per_page + 1).offset((page - 1) * per_page)

      solutions = all_records.first(per_page).map { |s| serialize_solution(s) }
      has_more = all_records.length > per_page

      counts = {
        all: Database::SolutionRecord.count,
        draft: Database::SolutionRecord.where(status: "draft").count,
        approved: Database::SolutionRecord.where(status: "approved").count,
        pushed: Database::SolutionRecord.where(status: "pushed").count,
        rejected: Database::SolutionRecord.where(status: "rejected").count
      }

      settings = Database.all_settings

      render inertia: "daylight/solutions", props: {
        solutions: solutions,
        counts: counts,
        status: status_filter,
        page: page,
        has_more: has_more,
        last_scan_at: settings["last_solutions_scan_at"],
        last_scan_count: settings["last_solutions_scan_count"],
        last_scan_error: settings["last_solutions_scan_error"],
        github_configured: settings["github_api_token"].present? && settings["github_repo_url"].present?
      }
    end

    def show
      solution = Database::SolutionRecord.find(params[:id])
      messages = Database::SolutionMessageRecord
        .where(solution_id: solution.id)
        .order(:created_at)
        .map { |m| { id: m.id, role: m.role, content: m.content, created_at: m.created_at } }

      source_issue = load_source_issue(solution)
      settings = Database.all_settings

      render inertia: "daylight/solution_show", props: {
        solution: serialize_solution(solution),
        messages: messages,
        source_issue: source_issue ? serialize_source_issue(source_issue, solution.source_type) : nil,
        github_configured: settings["github_api_token"].present? && settings["github_repo_url"].present?
      }
    end

    def update
      solution = Database::SolutionRecord.find(params[:id])
      new_status = params[:status]

      if %w[approved rejected draft].include?(new_status)
        attrs = { status: new_status }
        attrs[:approved_at] = Time.current if new_status == "approved"
        solution.update!(attrs)
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

    def serialize_solution(s)
      {
        id: s.id,
        source_type: s.source_type,
        source_issue_id: s.source_issue_id,
        title: s.title,
        problem_description: s.problem_description,
        proposed_fix: s.proposed_fix,
        file_paths: (JSON.parse(s.file_paths) rescue []),
        status: s.status,
        severity: s.severity,
        pr_url: s.pr_url,
        pr_branch: s.pr_branch,
        generated_at: s.generated_at,
        approved_at: s.approved_at,
        pushed_at: s.pushed_at,
        message_count: Database::SolutionMessageRecord.where(solution_id: s.id).count
      }
    end

    def load_source_issue(solution)
      if solution.source_type == "performance"
        Database::PerformanceIssueRecord.find_by(id: solution.source_issue_id)
      else
        Database::SecurityIssueRecord.find_by(id: solution.source_issue_id)
      end
    end

    def serialize_source_issue(issue, type)
      base = { id: issue.id, title: issue.title, severity: issue.severity }
      if type == "performance"
        base.merge(issue_type: issue.issue_type, sql_pattern: issue.sql_pattern, source_location: issue.source_location)
      else
        base.merge(warning_type: issue.warning_type, file_path: issue.file_path, line_number: issue.line_number)
      end
    end
  end
end

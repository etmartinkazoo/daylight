# frozen_string_literal: true

module Daylight
  class SolutionResource < BaseResource
    attributes :id, :source_type, :source_issue_id, :title, :problem_description,
               :proposed_fix, :status, :severity, :pr_url, :pr_branch,
               :generated_at, :approved_at, :pushed_at, :incident_id

    attribute :file_paths do |s|
      JSON.parse(s.file_paths) rescue []
    end

    attribute :message_count do |s|
      Database::SolutionMessageRecord.where(solution_id: s.id).count
    end
  end
end

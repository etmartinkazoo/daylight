# frozen_string_literal: true

module Daylight
  class SecurityIssueResource < BaseResource
    attributes :id, :issue_type, :warning_type, :severity, :confidence, :title,
               :description, :file_path, :line_number, :code_snippet, :check_name,
               :link, :fingerprint, :solution, :status, :detected_at
  end
end

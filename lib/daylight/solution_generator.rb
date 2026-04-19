# frozen_string_literal: true

require "net/http"
require "json"

module Daylight
  module SolutionGenerator
    class << self
      # Generate solutions for all open performance + security issues that don't have one yet
      def generate!
        Database.ensure_connected!

        unless Daylight::AI.configured?
          Database.set_setting("last_solutions_scan_error", "No AI API key configured")
          return []
        end

        solutions = []

        # Performance issues without a solution
        Database::PerformanceIssueRecord.where(status: "open").find_each do |issue|
          next if Database::SolutionRecord.exists?(source_type: "performance", source_issue_id: issue.id, status: %w[draft approved pushed])

          sol = generate_for_issue(issue, "performance")
          solutions << sol if sol
        end

        # Security issues without a solution
        Database::SecurityIssueRecord.where(status: "open").find_each do |issue|
          next if Database::SolutionRecord.exists?(source_type: "security", source_issue_id: issue.id, status: %w[draft approved pushed])

          sol = generate_for_issue(issue, "security")
          solutions << sol if sol
        end

        Database.set_setting("last_solutions_scan_at", Time.current.iso8601)
        Database.set_setting("last_solutions_scan_count", solutions.size.to_s)
        Database.set_setting("last_solutions_scan_error", nil)

        solutions
      rescue StandardError => e
        Rails.logger.error("[Daylight] Solution generation failed: #{e.message}") if defined?(Rails)
        Database.set_setting("last_solutions_scan_at", Time.current.iso8601) rescue nil
        Database.set_setting("last_solutions_scan_error", e.message.truncate(500)) rescue nil
        []
      end

      def due?
        Database.ensure_connected!
        return false unless Database.get_setting("solutions_scan_enabled") == "true"

        last = Database.get_setting("last_solutions_scan_at")
        last.blank? || Time.parse(last) < 24.hours.ago
      rescue StandardError
        false
      end

      # Refine a solution via chat
      def refine!(solution_id, user_message, model: nil)
        Database.ensure_connected!
        solution = Database::SolutionRecord.find(solution_id)
        raise "No AI API key configured" unless Daylight::AI.configured?

        # Store user message
        Database::SolutionMessageRecord.create!(
          solution_id: solution.id,
          role: "user",
          content: user_message,
          created_at: Time.current
        )

        # Build conversation with history
        messages = Database::SolutionMessageRecord
          .where(solution_id: solution.id)
          .order(:created_at)

        prompt = build_refinement_prompt(solution, messages)
        chat = Daylight::AI.chat(model: model)
        response = chat.ask(prompt)

        assistant_content = response.content

        # Store assistant response
        Database::SolutionMessageRecord.create!(
          solution_id: solution.id,
          role: "assistant",
          content: assistant_content,
          created_at: Time.current
        )

        # Update the proposed fix if the response contains code
        if assistant_content.include?("```")
          solution.update!(proposed_fix: assistant_content, status: "draft")
        end

        assistant_content
      end

      # Regenerate a solution from scratch
      def regenerate!(solution_id)
        Database.ensure_connected!
        solution = Database::SolutionRecord.find(solution_id)
        raise "No AI API key configured" unless Daylight::AI.configured?

        issue = solution.source_issue
        return unless issue

        result = call_ai(issue, solution.source_type)
        solution.update!(
          proposed_fix: result[:proposed_fix],
          file_paths: result[:file_paths],
          status: "draft"
        )
      end

      # Push an approved solution as a GitHub PR
      def push_to_github!(solution_id)
        Database.ensure_connected!
        solution = Database::SolutionRecord.find(solution_id)

        github_url = Database.get_setting("github_repo_url")
        github_token = Database.get_setting("github_api_token")
        default_branch = Database.get_setting("github_default_branch") || "main"

        raise "GitHub repo URL not configured" unless github_url.present?
        raise "GitHub API token not configured" unless github_token.present?

        match = github_url.match(%r{github\.com[:/]([^/]+)/([^/.]+)})
        raise "Invalid GitHub repo URL" unless match

        owner, repo = match[1], match[2]
        branch_name = "daylight/solution-#{solution.id}-#{Time.current.strftime('%Y%m%d%H%M%S')}"

        # 1. Get default branch SHA
        base_sha = github_api(:get, "/repos/#{owner}/#{repo}/git/ref/heads/#{default_branch}", github_token)
        raise "Could not get default branch" unless base_sha
        sha = base_sha.dig("object", "sha")

        # 2. Create branch
        github_api(:post, "/repos/#{owner}/#{repo}/git/refs", github_token, {
          ref: "refs/heads/#{branch_name}",
          sha: sha
        })

        # 3. Parse file changes from the proposed fix and commit them
        files = extract_file_changes(solution.proposed_fix)
        if files.any?
          files.each do |file_path, content|
            # Get current file (may not exist)
            existing = github_api(:get, "/repos/#{owner}/#{repo}/contents/#{file_path}?ref=#{branch_name}", github_token)
            file_sha = existing&.dig("sha")

            body = {
              message: "#{solution.title}\n\nGenerated by Daylight Solutions",
              content: Base64.strict_encode64(content),
              branch: branch_name
            }
            body[:sha] = file_sha if file_sha

            github_api(:put, "/repos/#{owner}/#{repo}/contents/#{file_path}", github_token, body)
          end
        end

        # 4. Create PR
        pr = github_api(:post, "/repos/#{owner}/#{repo}/pulls", github_token, {
          title: solution.title,
          body: "## Problem\n\n#{solution.problem_description}\n\n## Proposed Fix\n\n#{solution.proposed_fix}\n\n---\n_Generated by Daylight Solutions_",
          head: branch_name,
          base: default_branch
        })

        pr_url = pr&.dig("html_url") || pr&.dig("url")

        solution.update!(
          pr_url: pr_url,
          pr_branch: branch_name,
          status: "pushed",
          pushed_at: Time.current
        )

        pr_url
      end

      private

      def generate_for_issue(issue, source_type)
        result = call_ai(issue, source_type)
        return nil unless result

        Database::SolutionRecord.create!(
          source_type: source_type,
          source_issue_id: issue.id,
          title: result[:title],
          problem_description: result[:problem_description],
          proposed_fix: result[:proposed_fix],
          file_paths: result[:file_paths],
          severity: issue.severity,
          status: "draft",
          generated_at: Time.current
        )
      rescue StandardError => e
        Rails.logger.error("[Daylight] Solution generation for #{source_type}##{issue.id} failed: #{e.message}") if defined?(Rails)
        nil
      end

      def call_ai(issue, source_type)
        source_code = read_source_file(issue)
        prompt = build_generation_prompt(issue, source_type, source_code)

        chat = Daylight::AI.chat(model: Daylight::AI.solution_model)
        response = chat.ask(prompt)
        content = response.content

        {
          title: extract_title(issue, source_type),
          problem_description: build_problem_description(issue, source_type),
          proposed_fix: content,
          file_paths: extract_file_paths(issue, content).to_json
        }
      end

      def build_generation_prompt(issue, source_type, source_code)
        app_context = Database.get_setting("ai_context_notes") || ""

        prompt = <<~PROMPT
          You are an expert Ruby on Rails engineer. Generate a complete, ready-to-apply fix for this #{source_type} issue.

          ## Issue
          - Title: #{issue.title}
          - Severity: #{issue.severity}
          - Description: #{issue.try(:description) || issue.try(:problem_description)}
        PROMPT

        if source_type == "performance"
          prompt += <<~PERF
            - Type: #{issue.issue_type}
            - SQL Pattern: #{issue.try(:sql_pattern)}
            - Source: #{issue.try(:source_location)}
            - Controller: #{issue.try(:controller_action)}
            - Occurrences: #{issue.try(:occurrences)}
            - Total time: #{issue.try(:total_time_ms)}ms
          PERF
        else
          prompt += <<~SEC
            - Warning Type: #{issue.try(:warning_type)}
            - File: #{issue.try(:file_path)}:#{issue.try(:line_number)}
            - Code: `#{issue.try(:code_snippet)}`
            - Confidence: #{issue.try(:confidence)}
          SEC
        end

        if source_code.present?
          prompt += "\n## Current Source Code\n```ruby\n#{source_code}\n```\n"
        end

        if app_context.present?
          prompt += "\n## App Context\n#{app_context}\n"
        end

        prompt += <<~INSTRUCTIONS

          ## Instructions
          Provide your response in markdown with these sections:

          1. **Root Cause** — Why this issue exists (2-3 sentences)
          2. **Fix** — The complete code changes needed. For each file, show the full updated code block with the file path as a header. Use ```ruby code fences.
          3. **Migration** — If a database migration is needed, show it.
          4. **Testing** — How to verify the fix works (1-2 sentences).

          Be specific and complete. Show full method implementations, not just snippets. Include the file path above each code block like: `app/models/user.rb`
        INSTRUCTIONS

        prompt
      end

      def build_refinement_prompt(solution, messages)
        prompt = <<~PROMPT
          You are an expert Ruby on Rails engineer helping refine a solution.

          ## Original Problem
          #{solution.problem_description}

          ## Current Proposed Fix
          #{solution.proposed_fix}

          ## Conversation
        PROMPT

        messages.each do |msg|
          prompt += "\n**#{msg.role.capitalize}:** #{msg.content}\n"
        end

        prompt += <<~INSTRUCTIONS

          Respond to the user's latest message. If they request changes, provide the updated complete fix.
          Always include full code blocks with file paths. Use ```ruby code fences.
        INSTRUCTIONS

        prompt
      end

      def read_source_file(issue)
        path = issue.try(:source_location) || issue.try(:file_path)
        return nil unless path.present? && defined?(Rails)

        # Clean the path
        clean = path.split(":").first # Remove line number
        full_path = Rails.root.join(clean)

        return nil unless File.exist?(full_path)
        File.read(full_path).truncate(8000)
      rescue StandardError
        nil
      end

      def extract_title(issue, source_type)
        prefix = source_type == "performance" ? "Fix" : "Security fix"
        "#{prefix}: #{issue.title}".truncate(200)
      end

      def build_problem_description(issue, source_type)
        desc = issue.try(:description) || issue.try(:title) || ""
        if source_type == "performance" && issue.try(:sql_pattern).present?
          desc += "\n\nSQL: `#{issue.sql_pattern}`"
        end
        if issue.try(:source_location).present?
          desc += "\nSource: `#{issue.source_location}`"
        end
        desc
      end

      def extract_file_paths(issue, ai_content)
        paths = []
        paths << issue.try(:source_location)&.split(":")&.first
        paths << issue.try(:file_path)
        # Extract file paths from AI response (lines like `app/models/foo.rb`)
        ai_content.scan(%r{^`?(app/\S+\.rb)`?$}m).flatten.each { |p| paths << p }
        paths.compact.uniq
      end

      def extract_file_changes(proposed_fix)
        # Parse markdown code blocks with file paths
        # Expected format:
        #   `app/models/user.rb`
        #   ```ruby
        #   class User < ApplicationRecord
        #   ...
        #   ```
        changes = {}
        current_file = nil

        proposed_fix.to_s.lines.each do |line|
          if line.strip.match?(%r{^`?app/\S+\.\w+`?$})
            current_file = line.strip.delete('`')
          elsif line.strip.start_with?("```ruby") && current_file
            # Start collecting
          elsif line.strip == "```" && current_file && changes[current_file]
            current_file = nil
          elsif current_file && changes.key?(current_file)
            changes[current_file] += line
          elsif current_file && line.strip.start_with?("```")
            changes[current_file] = ""
          end
        end

        changes.reject { |_, v| v.blank? }
      end

      def github_api(method, path, token, body = nil)
        uri = URI("https://api.github.com#{path}")

        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true
        http.open_timeout = 10
        http.read_timeout = 30

        request = case method
                  when :get then Net::HTTP::Get.new(uri)
                  when :post then Net::HTTP::Post.new(uri)
                  when :put then Net::HTTP::Put.new(uri)
                  when :patch then Net::HTTP::Patch.new(uri)
                  end

        request["Authorization"] = "Bearer #{token}"
        request["Accept"] = "application/vnd.github.v3+json"
        request["User-Agent"] = "Daylight"
        request["Content-Type"] = "application/json" if body
        request.body = body.to_json if body

        response = http.request(request)
        JSON.parse(response.body) if response.body.present?
      rescue StandardError => e
        Rails.logger.error("[Daylight] GitHub API error: #{e.message}") if defined?(Rails)
        nil
      end
    end
  end
end

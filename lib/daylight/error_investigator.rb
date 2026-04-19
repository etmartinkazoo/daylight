# frozen_string_literal: true

require "base64"
require "net/http"
require "json"
require "timeout"

module Daylight
  module ErrorInvestigator
    INVESTIGATION_TIMEOUT = 120 # seconds

    class << self
      def investigate(error_record)
        Database.ensure_connected!

        unless Daylight::AI.configured?
          error_record.update!(ai_solution: "AI investigation unavailable — configure an API key in Settings.")
          return
        end

        # Track whether a branch was already pushed before this investigation
        already_pushed = error_record.ai_solution.to_s.include?("Fix branch pushed")

        context = gather_context(error_record)
        prompt = build_prompt(error_record, context)

        begin
          # Use the fast investigation model for triage/analysis
          response = Timeout.timeout(INVESTIGATION_TIMEOUT) do
            chat = Daylight::AI.chat(model: Daylight::AI.investigation_model)
            chat.ask(prompt)
          end

          error_record.update!(ai_solution: response.content)

          # Use the capable solution model for generating fix code
          if auto_push_enabled? && !already_pushed
            push_fix_branch(error_record, context)
          end
        rescue Timeout::Error
          error_record.update!(ai_solution: "AI investigation timed out after #{INVESTIGATION_TIMEOUT}s.")
        rescue StandardError => e
          error_record.update!(ai_solution: "AI investigation failed: #{e.message}")
        end

        broadcast_update(error_record)
      rescue StandardError => e
        error_record.update(ai_solution: "Investigation error: #{e.message}") rescue nil
        broadcast_update(error_record) rescue nil
      end

      private

      def broadcast_update(error_record)
        return unless defined?(Turbo::StreamsChannel)

        Turbo::StreamsChannel.broadcast_replace_to(
          "daylight_error_#{error_record.id}",
          target: "ai_analysis_error_record_#{error_record.id}",
          partial: "daylight/errors/ai_analysis",
          locals: { error: error_record }
        )
      rescue StandardError => e
        Rails.logger.debug("[Daylight] Broadcast failed: #{e.message}") if defined?(Rails)
      end

      def gather_context(error_record)
        ctx = {}

        # Recent occurrences with context
        ctx[:occurrences] = Database::OccurrenceRecord
          .where(error_id: error_record.id)
          .order(occurred_at: :desc)
          .limit(5)
          .map do |o|
            parsed_ctx = begin
              JSON.parse(o.context.to_s)
            rescue StandardError
              {}
            end
            {
              backtrace: o.backtrace,
              request_url: o.request_url,
              request_method: o.request_method,
              user_id: o.user_id,
              context: parsed_ctx,
              occurred_at: o.occurred_at
            }
          end

        # Source files from backtrace (via GitHub if configured)
        ctx[:source_files] = fetch_source_files(error_record)

        # App context from settings
        ctx[:app_context] = Database.get_setting("ai_context_notes")

        ctx
      end

      def build_prompt(error_record, ctx)
        prompt = <<~PROMPT
          You are an expert Ruby on Rails production debugger. A new error has been detected for the first time in this application. Analyze the evidence and propose a fix.

          ## Error
          - Class: #{error_record.error_class}
          - Message: #{error_record.message}
          - Severity: #{error_record.severity}
          - First seen: #{error_record.first_seen_at}
        PROMPT

        if error_record.backtrace_summary.present?
          prompt += "\n## Backtrace\n```\n#{error_record.backtrace_summary}\n```\n"
        end

        if ctx[:app_context].present?
          prompt += "\n## App Context\n#{ctx[:app_context]}\n"
        end

        if ctx[:occurrences].any?
          occ = ctx[:occurrences].first
          if occ[:request_url].present?
            prompt += "\n## Request\n- #{occ[:request_method]} #{occ[:request_url]}\n"
          end
          if occ[:context].is_a?(Hash) && occ[:context].any?
            prompt += "\n## Request Context\n"
            occ[:context].each { |k, v| prompt += "- #{k}: #{v}\n" }
          end
          if occ[:backtrace].present? && occ[:backtrace] != error_record.backtrace_summary
            prompt += "\n## Full Backtrace\n```\n#{occ[:backtrace]}\n```\n"
          end
        end

        if ctx[:source_files]&.any?
          prompt += "\n## Source Files\n"
          ctx[:source_files].each do |path, content|
            prompt += "\n### `#{path}`\n```ruby\n#{content}\n```\n"
          end
        end

        prompt += <<~INSTRUCTIONS

          ## Your Analysis
          Produce a structured markdown report with these sections:
          1. **Summary** — One paragraph explaining what this error is and when it occurs
          2. **Root Cause** — Your best assessment of why this error is happening, citing specific code and line numbers
          3. **Suggested Fix** — Specific code changes to resolve this error. Show complete code blocks with file paths.
          4. **Prevention** — What could prevent this class of error in the future (tests, validations, etc.)

          Be specific. Reference file names, error classes, and line numbers from the backtrace. If evidence is insufficient, say so clearly rather than speculating.
        INSTRUCTIONS

        prompt
      end

      def fetch_source_files(error_record)
        owner, repo = github_owner_repo
        return {} unless owner

        sha = default_branch
        paths = extract_app_paths(error_record.backtrace_summary.to_s)
        return {} if paths.empty?

        source_files = {}
        total_chars = 0
        max_total = 25_000
        max_per_file = 4_000

        paths.first(8).each do |path|
          break if total_chars >= max_total

          content = fetch_file_content(owner, repo, path, sha)
          next unless content

          truncated = content.truncate(max_per_file)
          source_files[path] = truncated
          total_chars += truncated.length
        end

        source_files
      rescue StandardError
        {}
      end

      def extract_app_paths(backtrace_text)
        backtrace_text.to_s.scan(%r{((?:app|lib|config)/\S+\.rb)(?::\d+)?}).flatten.uniq
      end

      def fetch_file_content(owner, repo, path, ref)
        token = Database.get_setting("github_api_token")
        uri = URI("https://api.github.com/repos/#{owner}/#{repo}/contents/#{path}?ref=#{ref}")

        req = Net::HTTP::Get.new(uri)
        req["Accept"] = "application/vnd.github.v3.raw"
        req["User-Agent"] = "Daylight"
        req["Authorization"] = "Bearer #{token}" if token.present?

        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true
        http.open_timeout = 5
        http.read_timeout = 15

        response = http.request(req)
        response.code == "200" ? response.body : nil
      rescue StandardError
        nil
      end

      def github_owner_repo
        github_url = Database.get_setting("github_repo_url")
        return [nil, nil] unless github_url.present?

        match = github_url.match(%r{github\.com[:/]([^/]+)/([^/.]+)})
        return [nil, nil] unless match

        [match[1], match[2]]
      end

      def default_branch
        Database.get_setting("github_default_branch").presence || "main"
      end

      def auto_push_enabled?
        Database.get_setting("auto_push_fix_branches") == "true" &&
          Database.github_configured?
      end

      def push_fix_branch(error_record, context = {})
        owner, repo = github_owner_repo
        return unless owner

        token = Database.get_setting("github_api_token")
        return unless token.present?

        # Generate a focused code fix using the capable solution model
        fix_content = generate_fix(error_record, context)
        return unless fix_content

        files = extract_file_changes(fix_content)
        return if files.empty?

        branch_ref = default_branch
        branch_name = "daylight/fix-#{error_record.id}-#{Time.current.strftime('%Y%m%d%H%M%S')}"

        # Get default branch SHA
        base = github_api(:get, "/repos/#{owner}/#{repo}/git/ref/heads/#{branch_ref}", token)
        return unless base

        sha = base.dig("object", "sha")

        # Create branch
        github_api(:post, "/repos/#{owner}/#{repo}/git/refs", token, {
          ref: "refs/heads/#{branch_name}",
          sha: sha
        })

        # Commit each file change
        files.each do |file_path, content|
          existing = github_api(:get, "/repos/#{owner}/#{repo}/contents/#{file_path}?ref=#{branch_name}", token)
          file_sha = existing&.dig("sha")

          body = {
            message: "Fix: #{error_record.error_class}\n\nAuto-generated by Daylight AI",
            content: Base64.strict_encode64(content),
            branch: branch_name
          }
          body[:sha] = file_sha if file_sha

          github_api(:put, "/repos/#{owner}/#{repo}/contents/#{file_path}", token, body)
        end

        # Append branch info to the AI solution
        branch_url = "https://github.com/#{owner}/#{repo}/compare/#{branch_ref}...#{branch_name}"
        error_record.update!(
          ai_solution: error_record.ai_solution + "\n\n---\n**Fix branch pushed:** [`#{branch_name}`](#{branch_url})"
        )
      rescue StandardError => e
        Rails.logger.error("[Daylight] Auto-push fix branch failed: #{e.message}") if defined?(Rails)
      end

      def generate_fix(error_record, ctx)
        source_files_section = ""
        if ctx[:source_files]&.any?
          ctx[:source_files].each do |path, content|
            source_files_section += "\n### `#{path}`\n```ruby\n#{content}\n```\n"
          end
        end

        prompt = <<~PROMPT
          You are an expert Ruby on Rails engineer. Generate a complete, ready-to-commit fix for this error.

          ## Error
          - Class: #{error_record.error_class}
          - Message: #{error_record.message}

          ## Backtrace
          ```
          #{error_record.backtrace_summary}
          ```

          ## Investigation Summary
          #{error_record.ai_solution.to_s.truncate(3000)}
        PROMPT

        prompt += "\n## Source Files\n#{source_files_section}" if source_files_section.present?

        if ctx[:app_context].present?
          prompt += "\n## App Context\n#{ctx[:app_context]}\n"
        end

        prompt += <<~INSTRUCTIONS

          ## Instructions
          Provide ONLY the fixed code. For each file that needs changes, output the file path on its own line followed by the complete updated code in a fenced code block. Example:

          `app/models/user.rb`
          ```ruby
          class User < ApplicationRecord
            # fixed code here
          end
          ```

          Show complete file contents, not partial snippets. Only include files that need changes.
        INSTRUCTIONS

        response = Timeout.timeout(INVESTIGATION_TIMEOUT) do
          chat = Daylight::AI.chat(model: Daylight::AI.solution_model)
          chat.ask(prompt)
        end

        response.content
      rescue StandardError => e
        Rails.logger.error("[Daylight] Fix generation failed: #{e.message}") if defined?(Rails)
        nil
      end

      # Parse markdown code blocks with file paths from AI solution
      def extract_file_changes(content)
        changes = {}
        current_file = nil
        in_code = false

        content.to_s.lines.each do |line|
          if !in_code && line.strip.match?(%r{^`?(app|lib|config)/\S+\.\w+`?$})
            current_file = line.strip.delete('`')
          elsif current_file && !in_code && line.strip.match?(/^```\w*/)
            in_code = true
            changes[current_file] = ""
          elsif in_code && line.strip == "```"
            in_code = false
            current_file = nil
          elsif in_code && current_file
            changes[current_file] += line
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

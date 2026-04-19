# frozen_string_literal: true

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

        context = gather_context(error_record)
        prompt = build_prompt(error_record, context)

        begin
          response = Timeout.timeout(INVESTIGATION_TIMEOUT) do
            chat = Daylight::AI.chat
            chat.ask(prompt)
          end

          error_record.update!(ai_solution: response.content)
        rescue Timeout::Error
          error_record.update!(ai_solution: "AI investigation timed out after #{INVESTIGATION_TIMEOUT}s.")
        rescue StandardError => e
          error_record.update!(ai_solution: "AI investigation failed: #{e.message}")
        end
      rescue StandardError => e
        error_record.update(ai_solution: "Investigation error: #{e.message}") rescue nil
      end

      private

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
    end
  end
end

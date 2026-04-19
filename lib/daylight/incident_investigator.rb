# frozen_string_literal: true

require "net/http"
require "json"
require "timeout"

module Daylight
  module IncidentInvestigator
    INVESTIGATION_TIMEOUT = 120 # seconds

    class << self
      def investigate(incident)
        Database.ensure_connected!

        unless Daylight::AI.configured?
          incident.update!(
            investigation: "AI investigation unavailable — configure an API key in Settings.",
            status: "open"
          )
          return
        end

        context = gather_context(incident)
        prompt = build_prompt(incident, context)

        begin
          response = Timeout.timeout(INVESTIGATION_TIMEOUT) do
            chat = Daylight::AI.chat
            chat.ask(prompt)
          end

          investigation = response.content
          summary = investigation.split("\n").reject(&:blank?).first&.truncate(300) || incident.title

          incident.update!(
            investigation: investigation,
            summary: summary,
            status: "open"
          )
        rescue Timeout::Error
          incident.update!(
            investigation: "AI investigation timed out after #{INVESTIGATION_TIMEOUT} seconds. You can reopen this incident to retry.",
            status: "open"
          )
        rescue StandardError => e
          incident.update!(
            investigation: "AI investigation failed: #{e.message}",
            status: "open"
          )
        end
      rescue StandardError => e
        # Last-resort rescue: ensure the incident never stays stuck in "investigating"
        incident.update(status: "open", investigation: "Investigation error: #{e.message}") rescue nil
      end

      # Unstick any incidents that have been in "investigating" for too long
      def unstick_stale!
        Database.ensure_connected!
        Database::IncidentRecord
          .where(status: "investigating")
          .where("started_at < ?", 5.minutes.ago)
          .find_each do |incident|
            incident.update!(
              status: "open",
              investigation: incident.investigation.presence || "Investigation did not complete. You can retry from the incident page."
            )
          end
      rescue StandardError
        # Never break the app
      end

      private

      def gather_context(incident)
        ctx = {}
        window_start = incident.started_at - 10.minutes
        window_end = incident.started_at + 5.minutes

        # Recent errors
        ctx[:errors] = Database::OccurrenceRecord
          .where("occurred_at BETWEEN ? AND ?", window_start, window_end)
          .order(occurred_at: :desc)
          .limit(20)
          .map do |o|
            err = Database::ErrorRecord.find_by(id: o.error_id)
            {
              error_class: err&.error_class,
              message: err&.message&.truncate(300),
              backtrace: err&.backtrace_summary,
              request_url: o.request_url,
              occurred_at: o.occurred_at
            }
          end

        # Related error detail
        if incident.related_error_id
          err = Database::ErrorRecord.find_by(id: incident.related_error_id)
          if err
            ctx[:primary_error] = {
              error_class: err.error_class,
              message: err.message,
              backtrace: err.backtrace_summary,
              occurrences: err.occurrences_count,
              first_seen: err.first_seen_at,
              affected_users: err.try(:affected_users_count) || 0
            }
          end
        end

        # Recent deploys
        ctx[:deploys] = Database::DeployRecord
          .where("deployed_at > ?", incident.started_at - 1.hour)
          .order(deployed_at: :desc)
          .limit(5)
          .map { |d| { version: d.version, git_sha: d.git_sha, deployed_by: d.deployed_by, deployed_at: d.deployed_at } }

        # Git diff (if deploy found and GitHub configured)
        if ctx[:deploys].any?
          ctx[:git_diff] = fetch_git_diff(ctx[:deploys])
        end

        # Source files from backtrace + deploy diff
        ctx[:source_files] = fetch_source_files(ctx, ctx[:deploys].first)

        # Affected requests (sample from window)
        ctx[:requests] = Database::RequestRecord
          .where("occurred_at BETWEEN ? AND ?", window_start, window_end)
          .where("status_code >= 500")
          .order(occurred_at: :desc)
          .limit(10)
          .map { |r| { method: r.method, path: r.path, status: r.status_code, duration_ms: r.duration_ms, controller: r.controller_action } }

        # Affected users
        ctx[:affected_users] = Database::OccurrenceRecord
          .where("occurred_at BETWEEN ? AND ?", window_start, window_end)
          .where.not(user_id: nil)
          .distinct
          .count(:user_id)

        # Historical baseline
        ctx[:baseline_24h] = Database::OccurrenceRecord
          .where("occurred_at BETWEEN ? AND ?", incident.started_at - 24.hours, window_start)
          .count

        # App context from settings
        ctx[:app_context] = Database.get_setting("ai_context_notes")

        ctx
      end

      def build_prompt(incident, ctx)
        trigger = JSON.parse(incident.trigger_data || "{}") rescue {}

        prompt = <<~PROMPT
          You are an expert production incident investigator for a Ruby on Rails web application.

          An anomaly has been detected in the monitoring system. Analyze all the evidence below and produce a detailed incident report in markdown.

          ## Incident
          - Type: #{incident.incident_type}
          - Title: #{incident.title}
          - Severity: #{incident.severity}
          - Started at: #{incident.started_at}
          - Trigger data: #{JSON.pretty_generate(trigger)}
        PROMPT

        if ctx[:app_context].present?
          prompt += "\n## App Context\n#{ctx[:app_context]}\n"
        end

        if ctx[:primary_error]
          e = ctx[:primary_error]
          prompt += <<~ERR

            ## Primary Error
            - Class: #{e[:error_class]}
            - Message: #{e[:message]}
            - Occurrences: #{e[:occurrences]}
            - First seen: #{e[:first_seen]}
            - Affected users: #{e[:affected_users]}
            - Backtrace:
            ```
            #{e[:backtrace]}
            ```
          ERR
        end

        if ctx[:errors].any?
          prompt += "\n## Recent Errors (last 10 minutes)\n"
          ctx[:errors].first(10).each do |e|
            prompt += "- #{e[:error_class]}: #{e[:message]&.truncate(100)} (#{e[:request_url]}, #{e[:occurred_at]})\n"
          end
        end

        if ctx[:deploys].any?
          prompt += "\n## Recent Deploys\n"
          ctx[:deploys].each do |d|
            prompt += "- #{d[:version]} (#{d[:git_sha]}) by #{d[:deployed_by]} at #{d[:deployed_at]}\n"
          end
        end

        if ctx[:git_diff].present?
          prompt += "\n## Git Diff (deploy range)\n```diff\n#{ctx[:git_diff].truncate(5000)}\n```\n"
        end

        if ctx[:source_files]&.any?
          prompt += "\n## Source Files\n"
          ctx[:source_files].each do |path, content|
            prompt += "\n### `#{path}`\n```ruby\n#{content}\n```\n"
          end
        end

        if ctx[:requests].any?
          prompt += "\n## Failing Requests (5xx)\n"
          ctx[:requests].each do |r|
            prompt += "- #{r[:method]} #{r[:path]} → #{r[:status]} (#{r[:duration_ms]&.round(0)}ms, #{r[:controller]})\n"
          end
        end

        prompt += "\n## Impact\n- Affected users: #{ctx[:affected_users]}\n- Baseline errors in prior 24h: #{ctx[:baseline_24h]}\n"

        prompt += <<~INSTRUCTIONS

          ## Your Analysis
          Produce a structured markdown report with these sections:
          1. **Summary** — One paragraph explaining what happened
          2. **Root Cause** — Your best assessment of why this happened, citing specific evidence
          3. **Deploy Correlation** — Was a recent deploy the likely trigger? Which files/changes?
          4. **Blast Radius** — How many users/endpoints are affected? Is this revenue-critical?
          5. **Suggested Fix** — Specific actionable steps to resolve this
          6. **Prevention** — What could prevent this in the future?

          Be specific. Reference file names, error classes, and line numbers from the backtrace. If evidence is insufficient, say so clearly rather than speculating.
        INSTRUCTIONS

        prompt
      end

      def fetch_git_diff(deploys)
        return nil unless deploys.any? && deploys.first[:git_sha].present?

        owner, repo = github_owner_repo
        return nil unless owner

        head_sha = deploys.first[:git_sha]

        # Compare between the latest and previous deploy to capture all changes
        if deploys.size >= 2 && deploys.second[:git_sha].present?
          base_sha = deploys.second[:git_sha]
          path = "/repos/#{owner}/#{repo}/compare/#{base_sha}...#{head_sha}"
        else
          # Only one deploy — fall back to single commit diff
          path = "/repos/#{owner}/#{repo}/commits/#{head_sha}"
        end

        github_request(path, accept: "application/vnd.github.v3.diff")
      rescue StandardError
        nil
      end

      # Fetch source files from GitHub at the deploy SHA.
      # Prioritizes backtrace files, then files changed in the deploy diff.
      def fetch_source_files(ctx, deploy)
        owner, repo = github_owner_repo
        return {} unless owner

        sha = deploy&.dig(:git_sha)
        return {} unless sha.present?

        file_paths = []

        # 1. Extract file paths from primary error backtrace (top frames)
        if ctx[:primary_error]&.dig(:backtrace).present?
          file_paths.concat(extract_app_paths(ctx[:primary_error][:backtrace]))
        end

        # 2. Extract from recent occurrence backtraces
        ctx[:errors]&.each do |e|
          file_paths.concat(extract_app_paths(e[:backtrace].to_s))
        end

        # 3. Extract changed files from the git diff
        if ctx[:git_diff].present?
          ctx[:git_diff].scan(%r{^diff --git a/(\S+) b/\S+}m).flatten.each do |path|
            file_paths << path if path.match?(%r{^(app|lib|config)/.*\.rb$})
          end
        end

        file_paths = file_paths.uniq.first(10)
        return {} if file_paths.empty?

        source_files = {}
        total_chars = 0
        max_total = 25_000
        max_per_file = 4_000

        file_paths.each do |path|
          break if total_chars >= max_total

          content = fetch_file_content(owner, repo, path, sha)
          next unless content

          truncated = truncate_around_relevant_lines(content, path, ctx, max_per_file)
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

      # Truncate file content, keeping lines around backtrace references when possible
      def truncate_around_relevant_lines(content, path, ctx, max_chars)
        lines = content.lines
        return content if content.length <= max_chars

        # Find line numbers referenced in backtraces for this file
        referenced_lines = []
        backtrace_text = ctx.dig(:primary_error, :backtrace).to_s
        backtrace_text.scan(/#{Regexp.escape(path)}:(\d+)/).flatten.each do |ln|
          referenced_lines << ln.to_i
        end

        if referenced_lines.any?
          # Extract windows around referenced lines
          chunks = []
          referenced_lines.sort.each do |line_num|
            window_start = [line_num - 30, 1].max
            window_end = [line_num + 30, lines.length].min
            chunks << "# ... (line #{window_start})\n"
            chunks.concat(lines[(window_start - 1)..(window_end - 1)] || [])
          end
          chunks.join.truncate(max_chars)
        else
          # No specific line references — take the beginning of the file
          content.truncate(max_chars)
        end
      end

      def fetch_file_content(owner, repo, path, sha)
        response = github_request(
          "/repos/#{owner}/#{repo}/contents/#{path}?ref=#{sha}",
          accept: "application/vnd.github.v3.raw"
        )
        response.presence
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

      def github_request(path, accept: "application/vnd.github.v3+json")
        token = Database.get_setting("github_api_token")
        uri = URI("https://api.github.com#{path}")

        req = Net::HTTP::Get.new(uri)
        req["Accept"] = accept
        req["User-Agent"] = "Daylight"
        req["Authorization"] = "Bearer #{token}" if token.present?

        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true
        http.open_timeout = 5
        http.read_timeout = 15

        response = http.request(req)
        response.code == "200" ? response.body : nil
      end
    end
  end
end

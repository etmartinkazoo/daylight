# frozen_string_literal: true

require "net/http"
require "json"

module Daylight
  module IncidentInvestigator
    class << self
      def investigate(incident)
        Database.ensure_connected!

        api_key = Database.get_setting("gemini_api_key")
        unless api_key.present?
          incident.update!(
            investigation: "AI investigation unavailable — configure a Gemini API key in Settings.",
            status: "open"
          )
          return
        end

        context = gather_context(incident)
        prompt = build_prompt(incident, context)

        begin
          configure_llm(api_key)
          chat = RubyLLM.chat(model: "gemini-2.0-flash")
          response = chat.ask(prompt)

          investigation = response.content
          summary = investigation.split("\n").reject(&:blank?).first&.truncate(300) || incident.title

          incident.update!(
            investigation: investigation,
            summary: summary,
            status: "open"
          )
        rescue StandardError => e
          incident.update!(
            investigation: "AI investigation failed: #{e.message}",
            status: "open"
          )
        end
      end

      private

      def configure_llm(api_key)
        RubyLLM.configure do |c|
          c.gemini_api_key = api_key
        end
      end

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
              backtrace: err&.backtrace_summary&.truncate(500),
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
          ctx[:git_diff] = fetch_git_diff(ctx[:deploys].first)
        end

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
          prompt += "\n## Git Diff (most recent deploy)\n```diff\n#{ctx[:git_diff].truncate(3000)}\n```\n"
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

      def fetch_git_diff(deploy)
        return nil unless deploy[:git_sha].present?

        github_url = Database.get_setting("github_repo_url")
        return nil unless github_url.present?

        # Extract owner/repo from URL
        match = github_url.match(%r{github\.com[:/]([^/]+)/([^/.]+)})
        return nil unless match

        owner, repo = match[1], match[2]
        sha = deploy[:git_sha]

        uri = URI("https://api.github.com/repos/#{owner}/#{repo}/commits/#{sha}")
        req = Net::HTTP::Get.new(uri)
        req["Accept"] = "application/vnd.github.v3.diff"
        req["User-Agent"] = "Daylight"

        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = true
        http.open_timeout = 5
        http.read_timeout = 10

        response = http.request(req)
        response.code == "200" ? response.body : nil
      rescue StandardError
        nil
      end
    end
  end
end

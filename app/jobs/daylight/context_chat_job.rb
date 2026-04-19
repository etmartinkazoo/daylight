# frozen_string_literal: true

require "net/http"
require "json"

module Daylight
  class ContextChatJob < ApplicationJob
    queue_as :default

    def perform(chat_id)
      Database.ensure_connected!
      chat = Database::ChatRecord.find(chat_id)

      # Refresh system instructions with full context before every completion
      prompt = build_rich_context(chat)
      chat.with_instructions(prompt) if prompt.present?

      chat.complete
    rescue StandardError => e
      Rails.logger.error("[Daylight] Context chat failed: #{e.message}") if defined?(Rails)
      chat = Database::ChatRecord.find_by(id: chat_id)
      chat&.add_message(role: :assistant, content: "Error: #{e.message}")
    end

    private

    def build_rich_context(chat)
      parts = ["You are an expert Ruby on Rails debugger helping investigate a production issue. Be concise and specific. Reference file names and line numbers. When suggesting fixes, show complete code."]

      app_context = Database.get_setting("ai_context_notes")
      parts << "App context: #{app_context}" if app_context.present?

      case chat.context_type
      when "error"  then parts.concat(error_context(chat.context_id))
      when "incident" then parts.concat(incident_context(chat.context_id))
      end

      parts.join("\n\n")
    end

    def error_context(error_id)
      parts = []
      error = Database::ErrorRecord.find_by(id: error_id)
      return parts unless error

      parts << <<~CTX
        ## Error
        - Class: #{error.error_class}
        - Message: #{error.message}
        - Occurrences: #{error.occurrences_count}
        - Severity: #{error.severity}
        - Status: #{error.status}
        - First seen: #{error.first_seen_at}
        - Last seen: #{error.last_seen_at}
      CTX

      parts << "## Backtrace\n```\n#{error.backtrace_summary}\n```" if error.backtrace_summary.present?

      occurrences = Database::OccurrenceRecord
        .where(error_id: error.id)
        .order(occurred_at: :desc)
        .limit(3)

      if occurrences.any?
        occ_text = "## Recent Occurrences\n"
        occurrences.each do |occ|
          occ_text += "- #{occ.request_method} #{occ.request_url} (#{occ.occurred_at})\n"
          ctx = begin; JSON.parse(occ.context.to_s); rescue; {}; end
          ctx.each { |k, v| occ_text += "  #{k}: #{v}\n" } if ctx.any?
        end
        parts << occ_text
      end

      parts << "## AI Investigation\n#{error.ai_solution}" if error.ai_solution.present? && error.ai_solution != ""

      source = fetch_source_from_backtrace(error.backtrace_summary)
      parts << source if source.present?

      parts
    end

    def incident_context(incident_id)
      parts = []
      incident = Database::IncidentRecord.find_by(id: incident_id)
      return parts unless incident

      parts << <<~CTX
        ## Incident
        - Type: #{incident.incident_type}
        - Title: #{incident.title}
        - Severity: #{incident.severity}
        - Status: #{incident.status}
        - Started: #{incident.started_at}
      CTX

      trigger = begin; JSON.parse(incident.trigger_data.to_s); rescue; {}; end
      if trigger.any?
        parts << "## Trigger Data\n" + trigger.map { |k, v| "- #{k}: #{v}" }.join("\n")
      end

      parts << "## AI Investigation\n#{incident.investigation}" if incident.investigation.present?

      if incident.related_error_id
        error = Database::ErrorRecord.find_by(id: incident.related_error_id)
        if error
          parts << "## Related Error: #{error.error_class}\n#{error.message}"
          parts << "Backtrace:\n```\n#{error.backtrace_summary}\n```" if error.backtrace_summary.present?
          source = fetch_source_from_backtrace(error.backtrace_summary)
          parts << source if source.present?
        end
      end

      parts
    end

    def fetch_source_from_backtrace(backtrace_text)
      return nil unless backtrace_text.present?

      owner, repo = github_owner_repo
      return nil unless owner

      token = Database.get_setting("github_api_token")
      branch = Database.get_setting("github_default_branch").presence || "main"

      paths = backtrace_text.scan(%r{((?:app|lib|config)/\S+\.rb)(?::(\d+))?}).uniq
      return nil if paths.empty?

      source_parts = ["## Source Code (from GitHub)"]
      total_chars = 0

      paths.first(5).each do |path, line_num|
        break if total_chars > 15_000

        content = fetch_file(owner, repo, path, branch, token)
        next unless content

        if line_num.to_i > 0
          lines = content.lines
          center = line_num.to_i
          window_start = [center - 20, 0].max
          window_end = [center + 20, lines.length - 1].min
          snippet = lines[window_start..window_end]
            .each_with_index
            .map { |l, i| "#{window_start + i + 1}: #{l}" }
            .join
          source_parts << "### `#{path}:#{line_num}`\n```ruby\n#{snippet}```"
          total_chars += snippet.length
        else
          truncated = content.truncate(3000)
          source_parts << "### `#{path}`\n```ruby\n#{truncated}```"
          total_chars += truncated.length
        end
      end

      source_parts.length > 1 ? source_parts.join("\n\n") : nil
    rescue StandardError
      nil
    end

    def fetch_file(owner, repo, path, ref, token)
      uri = URI("https://api.github.com/repos/#{owner}/#{repo}/contents/#{path}?ref=#{ref}")
      req = Net::HTTP::Get.new(uri)
      req["Accept"] = "application/vnd.github.v3.raw"
      req["User-Agent"] = "Daylight"
      req["Authorization"] = "Bearer #{token}" if token.present?

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.open_timeout = 5
      http.read_timeout = 10

      response = http.request(req)
      response.code == "200" ? response.body : nil
    rescue StandardError
      nil
    end

    def github_owner_repo
      url = Database.get_setting("github_repo_url")
      return [nil, nil] unless url.present?

      match = url.match(%r{github\.com[:/]([^/]+)/([^/.]+)})
      return [nil, nil] unless match

      [match[1], match[2]]
    end
  end
end

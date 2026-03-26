# frozen_string_literal: true

module Daylight
  module SecurityScanner
    class << self
      def scan!
        Database.ensure_connected!
        require "brakeman"

        scan_id = "sec_#{Time.current.to_i}_#{SecureRandom.hex(4)}"
        now = Time.current
        app_path = resolve_app_path

        # Run Brakeman
        min_confidence = (Database.get_setting("security_scan_min_confidence") || "1").to_i
        tracker = Brakeman.run(
          app_path: app_path,
          quiet: true,
          min_confidence: min_confidence,
          safe_methods: safe_methods_list
        )

        # Convert warnings to issues
        issues = tracker.warnings.map do |warning|
          severity = case warning.confidence
                     when 0 then "critical"   # High confidence
                     when 1 then "warning"    # Medium confidence
                     else "info"              # Weak confidence
                     end

          {
            scan_id: scan_id,
            issue_type: categorize_warning(warning.warning_type),
            warning_type: warning.warning_type.to_s,
            severity: severity,
            confidence: confidence_label(warning.confidence),
            title: "#{warning.warning_type}: #{warning.message.to_s.truncate(120)}",
            description: warning.message.to_s,
            file_path: warning.file&.to_s&.sub("#{app_path}/", ""),
            line_number: warning.line,
            code_snippet: warning.code&.to_s&.truncate(1000),
            check_name: warning.check_name,
            link: warning.link,
            fingerprint: warning.fingerprint,
            solution: nil,
            status: "open",
            detected_at: now
          }
        end

        # Deduplicate against existing open issues
        issues = deduplicate(issues)

        # Generate AI solutions if an API key is configured
        if Daylight::AI.configured?
          issues.each { |issue| generate_solution(issue) }
        end

        # Store results
        issues.each { |attrs| Database::SecurityIssueRecord.create!(attrs) }

        # Update scan metadata
        Database.set_setting("last_security_scan_at", now.iso8601)
        Database.set_setting("last_security_scan_id", scan_id)
        Database.set_setting("last_security_scan_count", issues.size.to_s)
        Database.set_setting("last_security_scan_error", nil)
        Database.set_setting("last_security_scan_total_warnings", tracker.warnings.size.to_s)

        issues
      rescue StandardError => e
        Rails.logger.error("[Daylight] Security scan failed: #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}") if defined?(Rails)
        Database.set_setting("last_security_scan_at", Time.current.iso8601) rescue nil
        Database.set_setting("last_security_scan_error", e.message.truncate(500)) rescue nil
        []
      end

      def due?
        Database.ensure_connected!
        return false unless Database.get_setting("security_scan_enabled") == "true"

        interval = scan_interval_seconds
        last_scan = Database.get_setting("last_security_scan_at")
        last_scan.blank? || Time.parse(last_scan) < interval.seconds.ago
      rescue StandardError
        false
      end

      private

      def resolve_app_path
        if defined?(Rails) && Rails.root
          Rails.root.to_s
        else
          Dir.pwd
        end
      end

      def scan_interval_seconds
        case Database.get_setting("security_scan_interval") || "daily"
        when "6h"     then 6 * 3600
        when "12h"    then 12 * 3600
        when "daily"  then 86_400
        when "weekly"  then 7 * 86_400
        else 86_400
        end
      end

      def confidence_label(confidence)
        case confidence
        when 0 then "high"
        when 1 then "medium"
        else "weak"
        end
      end

      def categorize_warning(warning_type)
        type = warning_type.to_s
        case type
        when /SQL Injection/i then "injection"
        when /Command Injection/i then "injection"
        when /Cross.?Site Scripting/i, /XSS/i then "xss"
        when /Cross.?Site Request Forgery/i, /CSRF/i then "csrf"
        when /Mass Assignment/i then "mass_assignment"
        when /Remote Code Execution/i, /Dangerous Eval/i, /Deserialization/i then "rce"
        when /Redirect/i then "redirect"
        when /File Access/i, /Path Traversal/i then "file_access"
        when /SSL/i, /Denial of Service/i then "config"
        when /Session/i, /Authentication/i then "auth"
        when /Render/i then "render"
        else "other"
        end
      end

      def safe_methods_list
        raw = Database.get_setting("security_scan_safe_methods")
        return [] unless raw.present?
        raw.split(",").map(&:strip).reject(&:blank?).map(&:to_sym)
      end

      # ── Deduplication ───────────────────────────────────────────────
      def deduplicate(issues)
        existing = Database::SecurityIssueRecord
          .where(status: "open")
          .pluck(:fingerprint)
          .to_set

        issues.reject { |i| existing.include?(i[:fingerprint]) }
      end

      # ── AI Solution Generation ──────────────────────────────────────
      def generate_solution(issue)
        prompt = build_solution_prompt(issue)
        chat = Daylight::AI.chat
        response = chat.ask(prompt)
        issue[:solution] = response.content
      rescue StandardError => e
        issue[:solution] = "AI solution generation failed: #{e.message}"
      end

      def build_solution_prompt(issue)
        app_context = Database.get_setting("ai_context_notes") || ""

        <<~PROMPT
          You are an expert Ruby on Rails security engineer. Analyze this security vulnerability found by Brakeman and provide a specific, actionable fix.

          ## Vulnerability
          - Type: #{issue[:warning_type]}
          - Category: #{issue[:issue_type]}
          - Severity/Confidence: #{issue[:severity]} (#{issue[:confidence]})
          - File: #{issue[:file_path]}:#{issue[:line_number]}
          - Message: #{issue[:description]}
          - Vulnerable Code: `#{issue[:code_snippet]}`
          #{issue[:link] ? "- Reference: #{issue[:link]}" : ""}

          #{"## App Context\n#{app_context}\n" if app_context.present?}

          ## Instructions
          Provide a concise fix in markdown format with:
          1. **Risk** — What an attacker could do exploiting this (1-2 sentences)
          2. **Fix** — The specific code change needed. Show a before/after code example.
          3. **Prevention** — How to prevent this class of vulnerability in the future (1-2 sentences).

          Be specific. Reference the file path and line number. Use Rails security best practices (strong parameters, parameterized queries, html_safe alternatives, etc.).

          Keep it under 250 words.
        PROMPT
      end
    end
  end
end

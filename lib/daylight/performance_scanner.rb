# frozen_string_literal: true

module Daylight
  module PerformanceScanner
    class << self
      def scan!
        Database.ensure_connected!

        scan_id = "scan_#{Time.current.to_i}_#{SecureRandom.hex(4)}"
        now = Time.current
        issues = []

        # Analyze the last 24 hours of query data
        since = 24.hours.ago

        issues.concat(detect_n_plus_ones(since, scan_id, now))
        issues.concat(detect_slow_query_patterns(since, scan_id, now))
        issues.concat(detect_counter_cache_candidates(since, scan_id, now))

        # Deduplicate against existing open issues
        issues = deduplicate(issues)

        # Generate AI solutions if API key is configured
        api_key = Database.get_setting("gemini_api_key")
        if api_key.present?
          issues.each { |issue| generate_solution(issue, api_key) }
        end

        # Store results
        issues.each { |attrs| Database::PerformanceIssueRecord.create!(attrs) }

        # Update last scan timestamp
        Database.set_setting("last_performance_scan_at", now.iso8601)
        Database.set_setting("last_performance_scan_id", scan_id)
        Database.set_setting("last_performance_scan_count", issues.size.to_s)

        issues
      rescue StandardError => e
        Rails.logger.error("[Daylight] Performance scan failed: #{e.message}") if defined?(Rails)
        Database.set_setting("last_performance_scan_at", Time.current.iso8601) rescue nil
        Database.set_setting("last_performance_scan_error", e.message) rescue nil
        []
      end

      def due?
        Database.ensure_connected!
        return false unless Database.get_setting("performance_scan_enabled") == "true"

        interval = scan_interval_seconds
        last_scan = Database.get_setting("last_performance_scan_at")
        last_scan.blank? || Time.parse(last_scan) < interval.seconds.ago
      rescue StandardError
        false
      end

      private

      def scan_interval_seconds
        case Database.get_setting("performance_scan_interval") || "daily"
        when "hourly" then 3600
        when "6h"     then 6 * 3600
        when "12h"    then 12 * 3600
        when "daily"  then 86_400
        when "weekly"  then 7 * 86_400
        else 86_400
        end
      end

      # ── N+1 Detection ──────────────────────────────────────────────
      # Find requests where the same normalized SQL was executed many times
      def detect_n_plus_ones(since, scan_id, now)
        results = Database::QueryRecord
          .where("occurred_at > ?", since)
          .where.not(trace_id: nil)
          .group(:trace_id, :normalized_sql)
          .having("COUNT(*) > 3")
          .select(
            "trace_id",
            "normalized_sql",
            "COUNT(*) as query_count",
            "ROUND(AVG(duration_ms), 2) as avg_ms",
            "ROUND(SUM(duration_ms), 2) as total_ms",
            "MAX(source_location) as source_loc",
            "MAX(controller_action) as ctrl_action"
          )
          .order(Arel.sql("COUNT(*) DESC"))
          .limit(200)

        # Group by normalized_sql pattern to find the most common N+1s
        patterns = {}
        results.each do |row|
          key = row.normalized_sql
          patterns[key] ||= {
            sql: row.normalized_sql,
            request_count: 0,
            total_queries: 0,
            total_time_ms: 0.0,
            max_per_request: 0,
            source_location: row.source_loc,
            controller_action: row.ctrl_action
          }
          p = patterns[key]
          p[:request_count] += 1
          p[:total_queries] += row.query_count.to_i
          p[:total_time_ms] += row.total_ms.to_f
          p[:max_per_request] = [p[:max_per_request], row.query_count.to_i].max
          p[:source_location] = row.source_loc if row.source_loc.present?
          p[:controller_action] = row.ctrl_action if row.ctrl_action.present?
        end

        patterns.values.sort_by { |p| -p[:total_time_ms] }.first(20).map do |p|
          severity = if p[:max_per_request] > 50 || p[:total_time_ms] > 5000
                       "critical"
                     elsif p[:max_per_request] > 10 || p[:total_time_ms] > 1000
                       "warning"
                     else
                       "info"
                     end

          {
            scan_id: scan_id,
            issue_type: "n_plus_one",
            severity: severity,
            title: "N+1 query: #{extract_table_name(p[:sql])}",
            description: "The same query pattern is executed #{p[:max_per_request]}x per request across #{p[:request_count]} requests. " \
                         "Total time wasted: #{p[:total_time_ms].round(0)}ms in the last 24h.",
            sql_pattern: p[:sql],
            source_location: p[:source_location],
            controller_action: p[:controller_action],
            occurrences: p[:total_queries],
            avg_duration_ms: p[:total_queries] > 0 ? (p[:total_time_ms] / p[:total_queries]).round(2) : 0,
            max_duration_ms: nil,
            total_time_ms: p[:total_time_ms].round(2),
            status: "open",
            detected_at: now
          }
        end
      end

      # ── Slow Query Patterns ─────────────────────────────────────────
      def detect_slow_query_patterns(since, scan_id, now)
        threshold = (Database.get_setting("slow_query_threshold_ms") || "50").to_f

        results = Database::QueryRecord
          .where("occurred_at > ?", since)
          .group(:normalized_sql)
          .having("AVG(duration_ms) > ?", threshold)
          .select(
            "normalized_sql",
            "COUNT(*) as total",
            "ROUND(AVG(duration_ms), 2) as avg_ms",
            "ROUND(MAX(duration_ms), 2) as max_ms",
            "ROUND(SUM(duration_ms), 2) as total_ms",
            "MAX(source_location) as source_loc",
            "MAX(controller_action) as ctrl_action"
          )
          .order(Arel.sql("SUM(duration_ms) DESC"))
          .limit(20)

        results.map do |row|
          severity = if row.avg_ms > 500 || row.max_ms > 2000
                       "critical"
                     elsif row.avg_ms > 200 || row.max_ms > 1000
                       "warning"
                     else
                       "info"
                     end

          {
            scan_id: scan_id,
            issue_type: "slow_query",
            severity: severity,
            title: "Slow query: #{extract_table_name(row.normalized_sql)} (avg #{row.avg_ms}ms)",
            description: "This query pattern averages #{row.avg_ms}ms (max #{row.max_ms}ms) across #{row.total} executions. " \
                         "Total time: #{row.total_ms.round(0)}ms in the last 24h.",
            sql_pattern: row.normalized_sql,
            source_location: row.source_loc,
            controller_action: row.ctrl_action,
            occurrences: row.total,
            avg_duration_ms: row.avg_ms,
            max_duration_ms: row.max_ms,
            total_time_ms: row.total_ms,
            status: "open",
            detected_at: now
          }
        end
      end

      # ── Counter Cache Candidates ────────────────────────────────────
      def detect_counter_cache_candidates(since, scan_id, now)
        results = Database::QueryRecord
          .where("occurred_at > ?", since)
          .where("normalized_sql LIKE ?", "%COUNT%")
          .group(:normalized_sql)
          .having("COUNT(*) > 10")
          .select(
            "normalized_sql",
            "COUNT(*) as total",
            "ROUND(AVG(duration_ms), 2) as avg_ms",
            "ROUND(SUM(duration_ms), 2) as total_ms",
            "MAX(source_location) as source_loc",
            "MAX(controller_action) as ctrl_action"
          )
          .order(Arel.sql("COUNT(*) DESC"))
          .limit(10)

        results.map do |row|
          {
            scan_id: scan_id,
            issue_type: "counter_cache",
            severity: row.total > 100 ? "warning" : "info",
            title: "Counter cache candidate: #{extract_table_name(row.normalized_sql)}",
            description: "This COUNT query runs #{row.total} times in the last 24h. " \
                         "A counter_cache column could eliminate these queries entirely.",
            sql_pattern: row.normalized_sql,
            source_location: row.source_loc,
            controller_action: row.ctrl_action,
            occurrences: row.total,
            avg_duration_ms: row.avg_ms,
            total_time_ms: row.total_ms,
            status: "open",
            detected_at: now
          }
        end
      end

      # ── Deduplication ───────────────────────────────────────────────
      def deduplicate(issues)
        existing = Database::PerformanceIssueRecord
          .where(status: "open")
          .pluck(:sql_pattern, :issue_type)
          .map { |sql, type| "#{type}:#{sql}" }
          .to_set

        issues.reject { |i| existing.include?("#{i[:issue_type]}:#{i[:sql_pattern]}") }
      end

      # ── AI Solution Generation ──────────────────────────────────────
      def generate_solution(issue, api_key)
        configure_llm(api_key)

        prompt = build_solution_prompt(issue)
        chat = RubyLLM.chat(model: "gemini-2.5-flash")
        response = chat.ask(prompt)
        issue[:solution] = response.content
      rescue StandardError => e
        issue[:solution] = "AI solution generation failed: #{e.message}"
      end

      def configure_llm(api_key)
        RubyLLM.configure do |c|
          c.gemini_api_key = api_key
        end
      end

      def build_solution_prompt(issue)
        app_context = Database.get_setting("ai_context_notes") || ""

        <<~PROMPT
          You are an expert Ruby on Rails performance engineer. Analyze this performance issue and provide a specific, actionable fix.

          ## Issue
          - Type: #{issue[:issue_type]}
          - Severity: #{issue[:severity]}
          - Title: #{issue[:title]}
          - Description: #{issue[:description]}
          - SQL Pattern: #{issue[:sql_pattern]}
          - Source Location: #{issue[:source_location] || "unknown"}
          - Controller/Action: #{issue[:controller_action] || "unknown"}
          - Occurrences: #{issue[:occurrences]}

          #{"## App Context\n#{app_context}\n" if app_context.present?}

          ## Instructions
          Provide a concise fix in markdown format with:
          1. **Root Cause** — Why this is happening (1-2 sentences)
          2. **Fix** — The specific code change needed. Show a before/after code example using Ruby/Rails.
          3. **Alternative** — If the primary fix isn't possible, suggest an alternative approach.

          Be specific. Reference the SQL pattern and source location. For N+1 issues, suggest the correct `includes` / `preload` / `eager_load`. For slow queries, suggest indexes or query rewrites. For counter_cache, show the migration and model changes.

          Keep it under 300 words.
        PROMPT
      end

      def extract_table_name(sql)
        return "unknown" unless sql
        match = sql.match(/FROM\s+[`"']?(\w+)[`"']?/i) ||
                sql.match(/UPDATE\s+[`"']?(\w+)[`"']?/i) ||
                sql.match(/INTO\s+[`"']?(\w+)[`"']?/i)
        match ? match[1] : sql.truncate(60)
      end
    end
  end
end

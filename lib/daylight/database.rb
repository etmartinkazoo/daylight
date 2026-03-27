# frozen_string_literal: true

require "sqlite3"
require "active_record"

module Daylight
  module Database
    class ErrorRecord < ActiveRecord::Base
      self.table_name = "daylight_errors"
    end

    class OccurrenceRecord < ActiveRecord::Base
      self.table_name = "daylight_occurrences"
    end

    class RequestRecord < ActiveRecord::Base
      self.table_name = "daylight_requests"
    end

    class QueryRecord < ActiveRecord::Base
      self.table_name = "daylight_queries"
    end

    class JobRecord < ActiveRecord::Base
      self.table_name = "daylight_jobs"
    end

    class LogRecord < ActiveRecord::Base
      self.table_name = "daylight_logs"
    end

    class DeployRecord < ActiveRecord::Base
      self.table_name = "daylight_deploys"
    end

    class HttpRequestRecord < ActiveRecord::Base
      self.table_name = "daylight_http_requests"
    end

    class CacheEventRecord < ActiveRecord::Base
      self.table_name = "daylight_cache_events"
    end

    class ScheduledTaskRecord < ActiveRecord::Base
      self.table_name = "daylight_scheduled_tasks"
    end

    class MailEventRecord < ActiveRecord::Base
      self.table_name = "daylight_mail_events"
    end

    class IncidentRecord < ActiveRecord::Base
      self.table_name = "daylight_incidents"
    end

    class SettingRecord < ActiveRecord::Base
      self.table_name = "daylight_settings"
    end

    class PerformanceIssueRecord < ActiveRecord::Base
      self.table_name = "daylight_performance_issues"
    end

    class SecurityIssueRecord < ActiveRecord::Base
      self.table_name = "daylight_security_issues"
    end

    class SolutionRecord < ActiveRecord::Base
      self.table_name = "daylight_solutions"
    end

    class SolutionMessageRecord < ActiveRecord::Base
      self.table_name = "daylight_solution_messages"
    end

    class << self
      def connection
        ensure_connected!
        ErrorRecord.connection
      end

      def ensure_connected!
        return if @connected

        db_path = Daylight.configuration.resolved_database_path
        db_dir = File.dirname(db_path)
        FileUtils.mkdir_p(db_dir) unless File.directory?(db_dir)

        config = {
          adapter: "sqlite3",
          database: db_path,
          pool: 5,
          timeout: 5000
        }

        [ErrorRecord, OccurrenceRecord, RequestRecord, QueryRecord, JobRecord, LogRecord, DeployRecord, HttpRequestRecord, CacheEventRecord, ScheduledTaskRecord, MailEventRecord, IncidentRecord, SettingRecord, PerformanceIssueRecord, SecurityIssueRecord, SolutionRecord, SolutionMessageRecord].each do |klass|
          klass.establish_connection(config)
        end

        migrate!
        @connected = true
      end

      def migrate!
        conn = ErrorRecord.connection

        # Errors
        unless conn.table_exists?(:daylight_errors)
          conn.create_table :daylight_errors do |t|
            t.string   :fingerprint, null: false
            t.string   :error_class, null: false
            t.text     :message
            t.text     :backtrace_summary
            t.integer  :occurrences_count, default: 1, null: false
            t.string   :status, default: "open", null: false
            t.string   :severity, default: "error", null: false
            t.datetime :first_seen_at, null: false
            t.datetime :last_seen_at, null: false
            t.timestamps
          end
          conn.add_index :daylight_errors, :fingerprint, unique: true
          conn.add_index :daylight_errors, :status
          conn.add_index :daylight_errors, :last_seen_at
        end

        # Occurrences
        unless conn.table_exists?(:daylight_occurrences)
          conn.create_table :daylight_occurrences do |t|
            t.integer  :error_id, null: false
            t.text     :backtrace
            t.text     :context
            t.string   :request_url
            t.string   :request_method
            t.datetime :occurred_at, null: false
          end
          conn.add_index :daylight_occurrences, :error_id
          conn.add_index :daylight_occurrences, :occurred_at
        end

        # Requests
        unless conn.table_exists?(:daylight_requests)
          conn.create_table :daylight_requests do |t|
            t.string   :method, null: false
            t.string   :path, null: false
            t.string   :controller_action
            t.integer  :status_code
            t.float    :duration_ms
            t.float    :db_duration_ms, default: 0
            t.float    :view_duration_ms, default: 0
            t.integer  :query_count, default: 0
            t.string   :route_pattern
            t.string   :format
            t.string   :ip
            t.datetime :occurred_at, null: false
          end
          conn.add_index :daylight_requests, :controller_action
          conn.add_index :daylight_requests, :occurred_at
          conn.add_index :daylight_requests, :duration_ms
          conn.add_index :daylight_requests, :route_pattern rescue nil
        end

        # Add route_pattern column if missing (migration for existing DBs)
        if conn.table_exists?(:daylight_requests) && !conn.column_exists?(:daylight_requests, :route_pattern)
          conn.add_column :daylight_requests, :route_pattern, :string
          conn.add_index :daylight_requests, :route_pattern rescue nil
        end

        # Queries
        unless conn.table_exists?(:daylight_queries)
          conn.create_table :daylight_queries do |t|
            t.text     :sql, null: false
            t.string   :normalized_sql
            t.float    :duration_ms
            t.string   :source_location
            t.string   :controller_action
            t.string   :request_path
            t.integer  :request_id
            t.datetime :occurred_at, null: false
          end
          conn.add_index :daylight_queries, :normalized_sql
          conn.add_index :daylight_queries, :occurred_at
          conn.add_index :daylight_queries, :duration_ms
          conn.add_index :daylight_queries, :request_id rescue nil
        end

        # Add request_id to queries if missing
        if conn.table_exists?(:daylight_queries) && !conn.column_exists?(:daylight_queries, :request_id)
          conn.add_column :daylight_queries, :request_id, :integer
          conn.add_index :daylight_queries, :request_id rescue nil
        end

        # Jobs
        unless conn.table_exists?(:daylight_jobs)
          conn.create_table :daylight_jobs do |t|
            t.string   :job_class, null: false
            t.string   :queue
            t.string   :status, null: false   # queued, completed, failed
            t.float    :duration_ms
            t.text     :error_message
            t.string   :error_class
            t.datetime :enqueued_at
            t.datetime :completed_at
            t.datetime :occurred_at, null: false
          end
          conn.add_index :daylight_jobs, :job_class
          conn.add_index :daylight_jobs, :occurred_at
          conn.add_index :daylight_jobs, :status
        end

        # Logs
        unless conn.table_exists?(:daylight_logs)
          conn.create_table :daylight_logs do |t|
            t.string   :level, null: false         # debug, info, warn, error, fatal, unknown
            t.text     :message, null: false
            t.string   :controller_action
            t.string   :request_path
            t.datetime :occurred_at, null: false
          end
          conn.add_index :daylight_logs, :level
          conn.add_index :daylight_logs, :occurred_at
        end

        # Deploys
        unless conn.table_exists?(:daylight_deploys)
          conn.create_table :daylight_deploys do |t|
            t.string   :version, null: false
            t.text     :description
            t.string   :git_sha
            t.string   :deployed_by
            t.datetime :deployed_at, null: false
          end
          conn.add_index :daylight_deploys, :deployed_at
        end

        # HTTP Requests
        unless conn.table_exists?(:daylight_http_requests)
          conn.create_table :daylight_http_requests do |t|
            t.string   :method
            t.string   :url, null: false
            t.string   :host
            t.integer  :status_code
            t.float    :duration_ms
            t.string   :controller_action
            t.string   :request_path
            t.datetime :occurred_at, null: false
          end
          conn.add_index :daylight_http_requests, :host
          conn.add_index :daylight_http_requests, :occurred_at
          conn.add_index :daylight_http_requests, :duration_ms
        end

        # Cache Events
        unless conn.table_exists?(:daylight_cache_events)
          conn.create_table :daylight_cache_events do |t|
            t.string   :event_type, null: false
            t.string   :key
            t.boolean  :hit
            t.float    :duration_ms
            t.string   :controller_action
            t.string   :request_path
            t.datetime :occurred_at, null: false
          end
          conn.add_index :daylight_cache_events, :event_type
          conn.add_index :daylight_cache_events, :occurred_at
        end

        # Add n_plus_one column to requests if missing
        if conn.table_exists?(:daylight_requests) && !conn.column_exists?(:daylight_requests, :n_plus_one)
          conn.add_column :daylight_requests, :n_plus_one, :boolean
        end

        # Add request_id column to occurrences if missing
        if conn.table_exists?(:daylight_occurrences) && !conn.column_exists?(:daylight_occurrences, :request_id)
          conn.add_column :daylight_occurrences, :request_id, :integer
          conn.add_index :daylight_occurrences, :request_id rescue nil
        end

        # Add handled/source columns to errors if missing (migration for existing DBs)
        if conn.table_exists?(:daylight_errors)
          unless conn.column_exists?(:daylight_errors, :handled)
            conn.add_column :daylight_errors, :handled, :boolean
          end
          unless conn.column_exists?(:daylight_errors, :source)
            conn.add_column :daylight_errors, :source, :string
          end
        end

        # Scheduled Tasks
        unless conn.table_exists?(:daylight_scheduled_tasks)
          conn.create_table :daylight_scheduled_tasks do |t|
            t.string   :task_class, null: false
            t.string   :command
            t.string   :frequency
            t.string   :status, null: false
            t.float    :duration_ms
            t.string   :error_class
            t.text     :error_message
            t.string   :trace_id
            t.datetime :occurred_at, null: false
          end
          conn.add_index :daylight_scheduled_tasks, :task_class
          conn.add_index :daylight_scheduled_tasks, :occurred_at
          conn.add_index :daylight_scheduled_tasks, :trace_id rescue nil
        end

        # Mail Events
        unless conn.table_exists?(:daylight_mail_events)
          conn.create_table :daylight_mail_events do |t|
            t.string   :event_type, null: false
            t.string   :mailer_class, null: false
            t.string   :action_name
            t.text     :recipients
            t.string   :channel
            t.string   :subject
            t.string   :status, null: false
            t.float    :duration_ms
            t.text     :error_message
            t.string   :trace_id
            t.datetime :occurred_at, null: false
          end
          conn.add_index :daylight_mail_events, :mailer_class
          conn.add_index :daylight_mail_events, :occurred_at
          conn.add_index :daylight_mail_events, :trace_id rescue nil
        end

        # Add trace_id to requests
        if conn.table_exists?(:daylight_requests) && !conn.column_exists?(:daylight_requests, :trace_id)
          conn.add_column :daylight_requests, :trace_id, :string
          conn.add_index :daylight_requests, :trace_id rescue nil
        end

        # Add trace_id to queries
        if conn.table_exists?(:daylight_queries) && !conn.column_exists?(:daylight_queries, :trace_id)
          conn.add_column :daylight_queries, :trace_id, :string
          conn.add_index :daylight_queries, :trace_id rescue nil
        end

        # Add trace_id to jobs
        if conn.table_exists?(:daylight_jobs) && !conn.column_exists?(:daylight_jobs, :trace_id)
          conn.add_column :daylight_jobs, :trace_id, :string
          conn.add_index :daylight_jobs, :trace_id rescue nil
        end

        # Add trace_id and request_id to http_requests
        if conn.table_exists?(:daylight_http_requests) && !conn.column_exists?(:daylight_http_requests, :trace_id)
          conn.add_column :daylight_http_requests, :trace_id, :string
          conn.add_index :daylight_http_requests, :trace_id rescue nil
        end

        if conn.table_exists?(:daylight_http_requests) && !conn.column_exists?(:daylight_http_requests, :request_id)
          conn.add_column :daylight_http_requests, :request_id, :integer
          conn.add_index :daylight_http_requests, :request_id rescue nil
        end

        # Add trace_id to cache_events
        if conn.table_exists?(:daylight_cache_events) && !conn.column_exists?(:daylight_cache_events, :trace_id)
          conn.add_column :daylight_cache_events, :trace_id, :string
          conn.add_index :daylight_cache_events, :trace_id rescue nil
        end

        # Add trace_id to logs
        if conn.table_exists?(:daylight_logs) && !conn.column_exists?(:daylight_logs, :trace_id)
          conn.add_column :daylight_logs, :trace_id, :string
          conn.add_index :daylight_logs, :trace_id rescue nil
        end

        # Add trace_id to occurrences
        if conn.table_exists?(:daylight_occurrences) && !conn.column_exists?(:daylight_occurrences, :trace_id)
          conn.add_column :daylight_occurrences, :trace_id, :string
          conn.add_index :daylight_occurrences, :trace_id rescue nil
        end

        # Add user_id to occurrences
        if conn.table_exists?(:daylight_occurrences) && !conn.column_exists?(:daylight_occurrences, :user_id)
          conn.add_column :daylight_occurrences, :user_id, :string
          conn.add_index :daylight_occurrences, :user_id rescue nil
        end

        # Add monitoring columns to errors
        if conn.table_exists?(:daylight_errors)
          unless conn.column_exists?(:daylight_errors, :affected_users_count)
            conn.add_column :daylight_errors, :affected_users_count, :integer, default: 0
          end
          unless conn.column_exists?(:daylight_errors, :avg_duration_ms)
            conn.add_column :daylight_errors, :avg_duration_ms, :float
          end
          unless conn.column_exists?(:daylight_errors, :max_duration_ms)
            conn.add_column :daylight_errors, :max_duration_ms, :float
          end
          unless conn.column_exists?(:daylight_errors, :threshold_exceeded_count)
            conn.add_column :daylight_errors, :threshold_exceeded_count, :integer, default: 0
          end
        end

        # Incidents
        unless conn.table_exists?(:daylight_incidents)
          conn.create_table :daylight_incidents do |t|
            t.string   :incident_type, null: false
            t.string   :title, null: false
            t.text     :summary
            t.string   :status, default: "open", null: false
            t.string   :severity, default: "warning", null: false
            t.text     :trigger_data
            t.text     :investigation
            t.integer  :related_error_id
            t.integer  :related_deploy_id
            t.datetime :started_at, null: false
            t.datetime :resolved_at
            t.datetime :occurred_at, null: false
            t.timestamps
          end
          conn.add_index :daylight_incidents, :status
          conn.add_index :daylight_incidents, :occurred_at
          conn.add_index :daylight_incidents, :incident_type
        end

        # Settings (single row, key-value)
        unless conn.table_exists?(:daylight_settings)
          conn.create_table :daylight_settings do |t|
            t.string :key, null: false
            t.text   :value
            t.timestamps
          end
          conn.add_index :daylight_settings, :key, unique: true
        end

        # Performance issues (from scheduled scans)
        unless conn.table_exists?(:daylight_performance_issues)
          conn.create_table :daylight_performance_issues do |t|
            t.string   :scan_id, null: false
            t.string   :issue_type, null: false   # n_plus_one, slow_query, counter_cache
            t.string   :severity, null: false      # critical, warning, info
            t.string   :title, null: false
            t.text     :description
            t.text     :sql_pattern
            t.string   :source_location
            t.string   :controller_action
            t.integer  :occurrences, default: 0
            t.float    :avg_duration_ms
            t.float    :max_duration_ms
            t.float    :total_time_ms
            t.text     :solution
            t.string   :status, default: "open"   # open, fixed, ignored
            t.datetime :detected_at, null: false
          end
          conn.add_index :daylight_performance_issues, :scan_id
          conn.add_index :daylight_performance_issues, :issue_type
          conn.add_index :daylight_performance_issues, :status
          conn.add_index :daylight_performance_issues, :detected_at
        end

        # Security issues (from Brakeman scans)
        unless conn.table_exists?(:daylight_security_issues)
          conn.create_table :daylight_security_issues do |t|
            t.string   :scan_id, null: false
            t.string   :issue_type, null: false      # injection, xss, csrf, mass_assignment, rce, redirect, file_access, config, auth, render, other
            t.string   :warning_type, null: false     # original Brakeman warning type
            t.string   :severity, null: false         # critical, warning, info
            t.string   :confidence                    # high, medium, weak
            t.string   :title, null: false
            t.text     :description
            t.string   :file_path
            t.integer  :line_number
            t.text     :code_snippet
            t.string   :check_name
            t.string   :link
            t.string   :fingerprint
            t.text     :solution
            t.string   :status, default: "open"       # open, fixed, ignored
            t.datetime :detected_at, null: false
          end
          conn.add_index :daylight_security_issues, :scan_id
          conn.add_index :daylight_security_issues, :issue_type
          conn.add_index :daylight_security_issues, :severity
          conn.add_index :daylight_security_issues, :status
          conn.add_index :daylight_security_issues, :fingerprint
          conn.add_index :daylight_security_issues, :detected_at
        end

        # Solutions (AI-generated fix proposals)
        unless conn.table_exists?(:daylight_solutions)
          conn.create_table :daylight_solutions do |t|
            t.string   :source_type, null: false     # performance, security
            t.integer  :source_issue_id, null: false
            t.string   :title, null: false
            t.text     :problem_description
            t.text     :proposed_fix                  # markdown with code diffs
            t.text     :file_paths                    # JSON array
            t.string   :status, default: "draft"      # draft, approved, pushed, rejected
            t.string   :severity, null: false
            t.string   :pr_url
            t.string   :pr_branch
            t.datetime :generated_at, null: false
            t.datetime :approved_at
            t.datetime :pushed_at
          end
          conn.add_index :daylight_solutions, :status
          conn.add_index :daylight_solutions, :severity
          conn.add_index :daylight_solutions, :generated_at
          conn.add_index :daylight_solutions, [:source_type, :source_issue_id]
        end

        # Solution chat messages
        unless conn.table_exists?(:daylight_solution_messages)
          conn.create_table :daylight_solution_messages do |t|
            t.integer  :solution_id, null: false
            t.string   :role, null: false             # user, assistant
            t.text     :content, null: false
            t.datetime :created_at, null: false
          end
          conn.add_index :daylight_solution_messages, :solution_id
        end
      end

      # Helper to read/write settings
      def get_setting(key)
        ensure_connected!
        SettingRecord.find_by(key: key)&.value
      end

      def set_setting(key, value)
        ensure_connected!
        record = SettingRecord.find_or_initialize_by(key: key)
        record.update!(value: value)
      end

      def all_settings
        ensure_connected!
        SettingRecord.all.each_with_object({}) { |r, h| h[r.key] = r.value }
      end

    end
  end
end

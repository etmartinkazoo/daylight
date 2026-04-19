# frozen_string_literal: true

module Daylight
  module Database
    # Contains all table and column definitions for the Daylight SQLite database.
    # Included into Database's singleton class so migrate! stays out of database.rb.
    module Schema
      include SchemaHelpers

      def migrate!
        conn = ErrorRecord.connection

        create_table_once(conn, :daylight_errors) do |t|
          t.string   :fingerprint,       null: false
          t.string   :error_class,       null: false
          t.text     :message
          t.text     :backtrace_summary
          t.integer  :occurrences_count, default: 1, null: false
          t.string   :status,            default: "open", null: false
          t.string   :severity,          default: "error", null: false
          t.datetime :first_seen_at,     null: false
          t.datetime :last_seen_at,      null: false
          t.timestamps
          t.index :fingerprint, unique: true
          t.index :status
          t.index :last_seen_at
        end

        create_table_once(conn, :daylight_occurrences) do |t|
          t.integer  :error_id,      null: false
          t.text     :backtrace
          t.text     :context
          t.string   :request_url
          t.string   :request_method
          t.datetime :occurred_at,   null: false
          t.index :error_id
          t.index :occurred_at
        end

        create_table_once(conn, :daylight_requests) do |t|
          t.string   :method,           null: false
          t.string   :path,             null: false
          t.string   :controller_action
          t.integer  :status_code
          t.float    :duration_ms
          t.float    :db_duration_ms,   default: 0
          t.float    :view_duration_ms, default: 0
          t.integer  :query_count,      default: 0
          t.string   :route_pattern
          t.string   :format
          t.string   :ip
          t.datetime :occurred_at,      null: false
          t.index :controller_action
          t.index :occurred_at
          t.index :duration_ms
          t.index :route_pattern
        end

        create_table_once(conn, :daylight_queries) do |t|
          t.text     :sql,               null: false
          t.string   :normalized_sql
          t.float    :duration_ms
          t.string   :source_location
          t.string   :controller_action
          t.string   :request_path
          t.integer  :request_id
          t.datetime :occurred_at,       null: false
          t.index :normalized_sql
          t.index :occurred_at
          t.index :duration_ms
          t.index :request_id
        end

        create_table_once(conn, :daylight_jobs) do |t|
          t.string   :job_class,    null: false
          t.string   :queue
          t.string   :status,       null: false   # queued, completed, failed
          t.float    :duration_ms
          t.text     :error_message
          t.string   :error_class
          t.datetime :enqueued_at
          t.datetime :completed_at
          t.datetime :occurred_at,  null: false
          t.index :job_class
          t.index :occurred_at
          t.index :status
        end

        create_table_once(conn, :daylight_logs) do |t|
          t.string   :level,             null: false   # debug, info, warn, error, fatal, unknown
          t.text     :message,           null: false
          t.string   :controller_action
          t.string   :request_path
          t.datetime :occurred_at,       null: false
          t.index :level
          t.index :occurred_at
        end

        create_table_once(conn, :daylight_deploys) do |t|
          t.string   :version,     null: false
          t.text     :description
          t.string   :git_sha
          t.string   :deployed_by
          t.datetime :deployed_at, null: false
          t.index :deployed_at
        end

        create_table_once(conn, :daylight_http_requests) do |t|
          t.string   :method
          t.string   :url,               null: false
          t.string   :host
          t.integer  :status_code
          t.float    :duration_ms
          t.string   :controller_action
          t.string   :request_path
          t.datetime :occurred_at,       null: false
          t.index :host
          t.index :occurred_at
          t.index :duration_ms
        end

        create_table_once(conn, :daylight_cache_events) do |t|
          t.string   :event_type,        null: false
          t.string   :key
          t.boolean  :hit
          t.float    :duration_ms
          t.string   :controller_action
          t.string   :request_path
          t.datetime :occurred_at,       null: false
          t.index :event_type
          t.index :occurred_at
        end

        create_table_once(conn, :daylight_scheduled_tasks) do |t|
          t.string   :task_class,  null: false
          t.string   :command
          t.string   :frequency
          t.string   :status,      null: false
          t.float    :duration_ms
          t.string   :error_class
          t.text     :error_message
          t.string   :trace_id
          t.datetime :occurred_at, null: false
          t.index :task_class
          t.index :occurred_at
          t.index :trace_id
        end

        create_table_once(conn, :daylight_mail_events) do |t|
          t.string   :event_type,   null: false
          t.string   :mailer_class, null: false
          t.string   :action_name
          t.text     :recipients
          t.string   :channel
          t.string   :subject
          t.string   :status,       null: false
          t.float    :duration_ms
          t.text     :error_message
          t.string   :trace_id
          t.datetime :occurred_at,  null: false
          t.index :mailer_class
          t.index :occurred_at
          t.index :trace_id
        end

        create_table_once(conn, :daylight_incidents) do |t|
          t.string   :incident_type,    null: false
          t.string   :title,            null: false
          t.text     :summary
          t.string   :status,           default: "open", null: false
          t.string   :severity,         default: "warning", null: false
          t.text     :trigger_data
          t.text     :investigation
          t.integer  :related_error_id
          t.integer  :related_deploy_id
          t.datetime :started_at,       null: false
          t.datetime :resolved_at
          t.datetime :occurred_at,      null: false
          t.timestamps
          t.index :status
          t.index :occurred_at
          t.index :incident_type
        end

        create_table_once(conn, :daylight_settings) do |t|
          t.string :key,   null: false
          t.text   :value
          t.timestamps
          t.index :key, unique: true
        end

        create_table_once(conn, :daylight_performance_issues) do |t|
          t.string   :scan_id,          null: false
          t.string   :issue_type,       null: false   # n_plus_one, slow_query, counter_cache
          t.string   :severity,         null: false   # critical, warning, info
          t.string   :title,            null: false
          t.text     :description
          t.text     :sql_pattern
          t.string   :source_location
          t.string   :controller_action
          t.integer  :occurrences,      default: 0
          t.float    :avg_duration_ms
          t.float    :max_duration_ms
          t.float    :total_time_ms
          t.text     :solution
          t.string   :status,           default: "open"   # open, fixed, ignored
          t.datetime :detected_at,      null: false
          t.index :scan_id
          t.index :issue_type
          t.index :status
          t.index :detected_at
        end

        create_table_once(conn, :daylight_security_issues) do |t|
          t.string   :scan_id,       null: false
          t.string   :issue_type,    null: false      # injection, xss, csrf, mass_assignment, rce, ...
          t.string   :warning_type,  null: false      # original Brakeman warning type
          t.string   :severity,      null: false      # critical, warning, info
          t.string   :confidence                      # high, medium, weak
          t.string   :title,         null: false
          t.text     :description
          t.string   :file_path
          t.integer  :line_number
          t.text     :code_snippet
          t.string   :check_name
          t.string   :link
          t.string   :fingerprint
          t.text     :solution
          t.string   :status,        default: "open"  # open, fixed, ignored
          t.datetime :detected_at,   null: false
          t.index :scan_id
          t.index :issue_type
          t.index :severity
          t.index :status
          t.index :fingerprint
          t.index :detected_at
        end

        create_table_once(conn, :daylight_solutions) do |t|
          t.string   :source_type,        null: false   # performance, security
          t.integer  :source_issue_id,    null: false
          t.string   :title,              null: false
          t.text     :problem_description
          t.text     :proposed_fix                      # markdown with code diffs
          t.text     :file_paths                        # JSON array
          t.string   :status,             default: "draft"  # draft, approved, pushed, rejected
          t.string   :severity,           null: false
          t.string   :pr_url
          t.string   :pr_branch
          t.datetime :generated_at,       null: false
          t.datetime :approved_at
          t.datetime :pushed_at
          t.index :status
          t.index :severity
          t.index :generated_at
          t.index [:source_type, :source_issue_id]
        end

        create_table_once(conn, :daylight_solution_messages) do |t|
          t.integer  :solution_id, null: false
          t.string   :role,        null: false   # user, assistant
          t.text     :content,     null: false
          t.datetime :created_at,  null: false
          t.index :solution_id
        end

        create_table_once(conn, :daylight_chats) do |t|
          t.string   :model_id
          t.string   :provider
          t.string   :context_type
          t.integer  :context_id
          t.string   :context_url
          t.timestamps
        end

        create_table_once(conn, :daylight_chat_messages) do |t|
          t.integer  :chat_id,       null: false
          t.string   :role,          null: false
          t.text     :content
          t.string   :model_id
          t.integer  :input_tokens
          t.integer  :output_tokens
          t.datetime :created_at,    null: false
          t.index :chat_id
        end

        create_table_once(conn, :daylight_tool_calls) do |t|
          t.integer  :chat_message_id, null: false
          t.string   :tool_call_id,    null: false
          t.string   :name,            null: false
          t.text     :arguments
          t.text     :result
          t.index :chat_message_id
        end

        # Column additions for existing databases (idempotent)
        add_column_once(conn, :daylight_requests,      :route_pattern,            :string,  index: true)
        add_column_once(conn, :daylight_requests,      :n_plus_one,               :boolean)
        add_column_once(conn, :daylight_requests,      :trace_id,                 :string,  index: true)
        add_column_once(conn, :daylight_queries,       :request_id,               :integer, index: true)
        add_column_once(conn, :daylight_queries,       :trace_id,                 :string,  index: true)
        add_column_once(conn, :daylight_jobs,          :trace_id,                 :string,  index: true)
        add_column_once(conn, :daylight_http_requests, :trace_id,                 :string,  index: true)
        add_column_once(conn, :daylight_http_requests, :request_id,               :integer, index: true)
        add_column_once(conn, :daylight_cache_events,  :trace_id,                 :string,  index: true)
        add_column_once(conn, :daylight_logs,          :trace_id,                 :string,  index: true)
        add_column_once(conn, :daylight_occurrences,   :request_id,               :integer, index: true)
        add_column_once(conn, :daylight_occurrences,   :trace_id,                 :string,  index: true)
        add_column_once(conn, :daylight_occurrences,   :user_id,                  :string,  index: true)
        add_column_once(conn, :daylight_errors,        :handled,                  :boolean)
        add_column_once(conn, :daylight_errors,        :source,                   :string)
        add_column_once(conn, :daylight_errors,        :affected_users_count,     :integer, default: 0)
        add_column_once(conn, :daylight_errors,        :avg_duration_ms,          :float)
        add_column_once(conn, :daylight_errors,        :max_duration_ms,          :float)
        add_column_once(conn, :daylight_errors,        :threshold_exceeded_count, :integer, default: 0)
        add_column_once(conn, :daylight_solutions,    :incident_id,              :integer, index: true)
        add_column_once(conn, :daylight_errors,        :ai_solution,              :text)
      end
    end
  end
end

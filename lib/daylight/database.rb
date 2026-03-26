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

    class SettingRecord < ActiveRecord::Base
      self.table_name = "daylight_settings"
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

        [ErrorRecord, OccurrenceRecord, RequestRecord, QueryRecord, JobRecord, LogRecord, DeployRecord, HttpRequestRecord, CacheEventRecord, SettingRecord].each do |klass|
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

        # Settings (single row, key-value)
        unless conn.table_exists?(:daylight_settings)
          conn.create_table :daylight_settings do |t|
            t.string :key, null: false
            t.text   :value
            t.timestamps
          end
          conn.add_index :daylight_settings, :key, unique: true
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

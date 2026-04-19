# frozen_string_literal: true

require "sqlite3"
require "active_record"
require_relative "database/schema_helpers"
require_relative "database/has_status_counts"
require_relative "database/schema"

module Daylight
  module Database
    # Delegate Database::XRecord to Daylight::XRecord (models live in app/models/daylight/).
    # All existing Database::XRecord references continue to work without any changes.
    def self.const_missing(name)
      if Daylight.const_defined?(name, false)
        Daylight.const_get(name)
      else
        super
      end
    end

    SENSITIVE_KEYS = {
      "gemini_api_key" => "gemini_api_key_saved_at",
      "anthropic_api_key" => "anthropic_api_key_saved_at",
      "openai_api_key" => "openai_api_key_saved_at",
      "github_api_token" => "github_api_token_saved_at"
    }.freeze

    class << self
      include Schema

      def connection
        ensure_connected!
        Daylight::ErrorRecord.connection
      end

      def ensure_connected!
        return if @connected

        db_path = Daylight.configuration.resolved_database_path
        db_dir = File.dirname(db_path)
        FileUtils.mkdir_p(db_dir) unless File.directory?(db_dir)

        config = {
          adapter: "sqlite3",
          database: db_path,
          pool: 10,
          timeout: 15000,
          pragmas: {
            journal_mode: "wal",
            synchronous: "normal",
            busy_timeout: 15000
          }
        }

        all_record_classes.each { |klass| klass.establish_connection(config) }

        # Set pragmas via raw SQL as fallback for adapters that don't support the pragmas config key
        begin
          raw = Daylight::ErrorRecord.connection
          raw.execute("PRAGMA journal_mode=WAL")
          raw.execute("PRAGMA synchronous=NORMAL")
          raw.execute("PRAGMA busy_timeout=15000")
        rescue StandardError
          # Non-fatal — pragmas are a performance optimization
        end

        migrate!

        # Force AR to re-read column info after table creation
        all_record_classes.each do |klass|
          klass.reset_column_information
          # Verify the class can see its columns — if not, the table may not exist
          klass.column_names rescue nil
        end

        @connected = true
      end

      def reset_connection!
        @connected = false
      end

      def bullet_diagnostic_active?
        expires_at = all_settings["bullet_diagnostic_expires_at"]
        return false if expires_at.blank?

        Time.parse(expires_at) > Time.current
      rescue StandardError
        false
      end

      def github_configured?
        s = all_settings
        s["github_api_token"].present? && s["github_repo_url"].present?
      end

      def get_setting(key)
        ensure_connected!
        Daylight::SettingRecord.find_by(key: key)&.value
      end

      def set_setting(key, value)
        ensure_connected!
        record = Daylight::SettingRecord.find_or_initialize_by(key: key)
        record.update!(value: value)
      end

      def all_settings
        ensure_connected!
        Daylight::SettingRecord.all.each_with_object({}) { |r, h| h[r.key] = r.value }
      end

      private

      def all_record_classes
        [
          Daylight::ErrorRecord,
          Daylight::OccurrenceRecord,
          Daylight::RequestRecord,
          Daylight::QueryRecord,
          Daylight::JobRecord,
          Daylight::LogRecord,
          Daylight::DeployRecord,
          Daylight::HttpRequestRecord,
          Daylight::CacheEventRecord,
          Daylight::ScheduledTaskRecord,
          Daylight::MailEventRecord,
          Daylight::IncidentRecord,
          Daylight::SettingRecord,
          Daylight::PerformanceIssueRecord,
          Daylight::SecurityIssueRecord,
          Daylight::SolutionRecord,
          Daylight::SolutionMessageRecord,
          Daylight::InvestigationQueueRecord,
          Daylight::ChatRecord,
          Daylight::ChatMessageRecord,
          Daylight::ToolCallRecord,
          Daylight::ModelRecord
        ]
      end
    end
  end
end

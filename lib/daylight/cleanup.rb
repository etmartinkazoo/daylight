# frozen_string_literal: true

module Daylight
  class Cleanup
    class << self
      def perform
        Database.ensure_connected!

        retention_days = (Database.get_setting("retention_days") || "30").to_i
        cutoff = retention_days.days.ago

        results = {}

        # Delete old records from time-series tables
        {
          "occurrences" => Database::OccurrenceRecord,
          "requests" => Database::RequestRecord,
          "queries" => Database::QueryRecord,
          "jobs" => Database::JobRecord,
          "logs" => Database::LogRecord
        }.each do |name, klass|
          results[name] = klass.where("occurred_at < ?", cutoff).delete_all
        end

        # Optional tables (check if table exists)
        %w[http_requests cache_events scheduled_tasks mail_events].each do |name|
          klass = case name
                  when "http_requests" then Database::HttpRequestRecord
                  when "cache_events" then Database::CacheEventRecord
                  when "scheduled_tasks" then Database::ScheduledTaskRecord
                  when "mail_events" then Database::MailEventRecord
                  end

          if klass.connection.table_exists?(klass.table_name)
            results[name] = klass.where("occurred_at < ?", cutoff).delete_all
          end
        end

        # Deploys
        results["deploys"] = Database::DeployRecord.where("deployed_at < ?", cutoff).delete_all

        # Incidents
        if Database::IncidentRecord.connection.table_exists?(Database::IncidentRecord.table_name)
          results["incidents"] = Database::IncidentRecord.where("occurred_at < ?", cutoff).delete_all
        end

        # Errors: delete errors with no remaining occurrences and last_seen_at < cutoff
        orphaned_errors = Database::ErrorRecord
          .where("last_seen_at < ?", cutoff)
          .where.not(
            id: Database::OccurrenceRecord.select(:error_id).distinct
          )
        results["errors"] = orphaned_errors.delete_all

        # VACUUM the SQLite database
        Database::ErrorRecord.connection.execute("VACUUM")

        results
      rescue StandardError => e
        Rails.logger.error("[Daylight] Cleanup error: #{e.message}") if defined?(Rails)
        {}
      end
    end
  end
end

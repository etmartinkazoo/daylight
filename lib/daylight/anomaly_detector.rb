# frozen_string_literal: true

module Daylight
  module AnomalyDetector
    def self.subscribe!
      ActiveSupport::Notifications.subscribe("error_recorded.daylight") do
        check!
      end
    end

    class << self
      def check!
        return unless Daylight.configuration.anomaly_detection_enabled
        return if checked_recently?

        Database.ensure_connected!
        mark_checked!

        IncidentInvestigator.unstick_stale!
        check_error_spike
        check_new_errors
        check_latency_spike
        check_failure_spike
      rescue StandardError
        # Never break the app
      end

      private

      def checked_recently?
        last = Database.get_setting("last_anomaly_check")
        return false unless last
        Time.parse(last) > Daylight.configuration.anomaly_check_interval.seconds.ago
      rescue StandardError
        false
      end

      def mark_checked!
        Database.set_setting("last_anomaly_check", Time.current.iso8601)
      end

      def check_error_spike
        threshold = Daylight.configuration.anomaly_error_spike_threshold
        recent = Database::OccurrenceRecord.where("occurred_at > ?", 5.minutes.ago).count
        baseline_total = Database::OccurrenceRecord.where("occurred_at > ?", 1.hour.ago).count
        baseline_avg = baseline_total / 12.0 # per 5-min bucket

        return if recent < 5 # minimum floor
        return if baseline_avg == 0
        return unless recent > baseline_avg * threshold

        severity = recent > baseline_avg * 5 ? "critical" : "warning"

        create_incident(
          type: "error_spike",
          title: "Error spike: #{recent} errors in 5 minutes (#{(recent / baseline_avg).round(1)}x normal)",
          severity: severity,
          trigger_data: { recent_5m: recent, baseline_avg_5m: baseline_avg.round(1), threshold: threshold }
        )
      end

      def check_new_errors
        Database::ErrorRecord
          .where(occurrences_count: 1)
          .where("first_seen_at > ?", 5.minutes.ago)
          .each do |err|
            create_incident(
              type: "new_error",
              title: "New error: #{err.error_class}",
              severity: "info",
              trigger_data: { error_class: err.error_class, message: err.message&.truncate(200) },
              related_error_id: err.id
            )
          end
      end

      def check_latency_spike
        threshold = Daylight.configuration.anomaly_latency_spike_threshold
        recent_avg = Database::RequestRecord.where("occurred_at > ?", 5.minutes.ago).average(:duration_ms)
        baseline_avg = Database::RequestRecord.where("occurred_at > ?", 1.hour.ago).average(:duration_ms)

        return unless recent_avg && baseline_avg && baseline_avg > 0
        return unless recent_avg > baseline_avg * threshold

        severity = recent_avg > baseline_avg * 5 ? "critical" : "warning"

        create_incident(
          type: "latency_spike",
          title: "Latency spike: #{recent_avg.round(0)}ms avg (#{(recent_avg / baseline_avg).round(1)}x normal)",
          severity: severity,
          trigger_data: { recent_avg_ms: recent_avg.round(1), baseline_avg_ms: baseline_avg.round(1), threshold: threshold }
        )
      end

      def check_failure_spike
        recent = Database::JobRecord.where(status: "failed").where("occurred_at > ?", 5.minutes.ago).count
        baseline_total = Database::JobRecord.where(status: "failed").where("occurred_at > ?", 1.hour.ago).count
        baseline_avg = baseline_total / 12.0

        return if recent < 3
        return if baseline_avg == 0
        return unless recent > baseline_avg * 3

        create_incident(
          type: "failure_spike",
          title: "Job failure spike: #{recent} failures in 5 minutes",
          severity: "warning",
          trigger_data: { recent_5m: recent, baseline_avg_5m: baseline_avg.round(1) }
        )
      end

      def create_incident(type:, title:, severity:, trigger_data:, related_error_id: nil)
        # Dedup: skip if similar incident exists within 30 min
        existing = Database::IncidentRecord
          .where(incident_type: type)
          .where(status: %w[open investigating])
          .where("occurred_at > ?", 30.minutes.ago)
        existing = existing.where(related_error_id: related_error_id) if related_error_id
        return if existing.exists?

        # Find recent deploy
        recent_deploy = Database::DeployRecord.where("deployed_at > ?", 30.minutes.ago).order(deployed_at: :desc).first rescue nil

        now = Time.current
        incident = Database::IncidentRecord.create!(
          incident_type: type,
          title: title,
          status: "open",
          severity: severity,
          trigger_data: trigger_data.to_json,
          related_error_id: related_error_id,
          related_deploy_id: recent_deploy&.id,
          started_at: now,
          occurred_at: now
        )

        # Auto-investigate new incidents with AI
        if Daylight::AI.configured? && Database.get_setting("auto_investigate_errors") != "false"
          investigate_async(incident)
        end

        incident
      end

      def investigate_async(incident)
        Daylight::InvestigateIncidentJob.perform_later(incident.id)
      rescue StandardError
        Thread.new { IncidentInvestigator.investigate(incident) }
      end
    end
  end
end

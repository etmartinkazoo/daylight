# frozen_string_literal: true

module Daylight
  class IncidentsController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = params[:period] || "7d"
      scope = Database::IncidentRecord.all

      status = params[:status].presence || "open"
      scope = scope.where(status: status) unless status == "all"

      if params[:incident_type].present?
        scope = scope.where(incident_type: params[:incident_type])
      end

      scope = scope.order(occurred_at: :desc).limit(100)

      incidents = scope.map { |i| serialize_incident(i) }

      counts = {
        open: Database::IncidentRecord.where(status: "open").count,
        investigating: Database::IncidentRecord.where(status: "investigating").count,
        resolved: Database::IncidentRecord.where(status: "resolved").count,
        false_alarm: Database::IncidentRecord.where(status: "false_alarm").count,
        total: Database::IncidentRecord.count
      }

      incident_scope = Database::IncidentRecord.where("occurred_at > ?", period_start(period))

      render inertia: "daylight/incidents", props: {
        incidents: incidents,
        counts: counts,
        status: status,
        period: period,
        incident_series: time_series_buckets(incident_scope, period)
      }
    end

    def show
      incident = Database::IncidentRecord.find(params[:id])

      # Load related error if present
      related_error = nil
      if incident.related_error_id
        err = Database::ErrorRecord.find_by(id: incident.related_error_id)
        if err
          related_error = {
            id: err.id,
            error_class: err.error_class,
            message: err.message,
            backtrace_summary: err.backtrace_summary,
            occurrences_count: err.occurrences_count,
            status: err.status,
            affected_users_count: err.try(:affected_users_count) || 0,
            first_seen_at: err.first_seen_at,
            last_seen_at: err.last_seen_at
          }
        end
      end

      # Load related deploy if present
      related_deploy = nil
      if incident.related_deploy_id
        dep = Database::DeployRecord.find_by(id: incident.related_deploy_id)
        if dep
          related_deploy = {
            id: dep.id,
            version: dep.version,
            git_sha: dep.git_sha,
            deployed_by: dep.deployed_by,
            deployed_at: dep.deployed_at
          }
        end
      end

      render inertia: "daylight/incident_show", props: {
        incident: serialize_incident(incident),
        related_error: related_error,
        related_deploy: related_deploy
      }
    end

    def update
      incident = Database::IncidentRecord.find(params[:id])
      if %w[open resolved false_alarm].include?(params[:status])
        attrs = { status: params[:status] }
        attrs[:resolved_at] = Time.current if params[:status] == "resolved"
        incident.update!(attrs)
      end
      redirect_to incidents_path(status: params[:filter_status] || "open")
    end

    private

    def period_start(period)
      case period
      when "1h"  then 1.hour.ago
      when "24h" then 24.hours.ago
      when "7d"  then 7.days.ago
      when "30d" then 30.days.ago
      else 7.days.ago
      end
    end

    def serialize_incident(i)
      {
        id: i.id,
        incident_type: i.incident_type,
        title: i.title,
        summary: i.summary,
        status: i.status,
        severity: i.severity,
        trigger_data: (JSON.parse(i.trigger_data) rescue {}),
        investigation: i.investigation,
        related_error_id: i.related_error_id,
        related_deploy_id: i.related_deploy_id,
        started_at: i.started_at,
        resolved_at: i.resolved_at,
        occurred_at: i.occurred_at
      }
    end
  end
end

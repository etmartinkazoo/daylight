# frozen_string_literal: true

module Daylight
  class IncidentsController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def default_period = "7d"

    def index
      period = current_period
      scope = Database::IncidentRecord.all

      status = params[:status].presence || "open"
      scope = scope.where(status: status) unless status == "all"
      scope = scope.where(incident_type: params[:incident_type]) if params[:incident_type].present?

      scope = scope.order(occurred_at: :desc)
      pagy, incidents = pagy(scope, limit: 50)

      incident_scope = Database::IncidentRecord.where("occurred_at > ?", period_start(period))

      render inertia: {
        incidents: InertiaRails.scroll(pagy) { incidents.map { |i| serialize_incident(i) } },
        counts: Database::IncidentRecord.status_counts,
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

      render inertia: {
        incident: serialize_incident(incident),
        related_error: related_error,
        related_deploy: related_deploy
      }
    end

    def update
      incident = Database::IncidentRecord.find(params[:id])
      case params[:status]
      when "resolved"    then incident.resolve!
      when "open"        then incident.reopen!
      when "false_alarm" then incident.mark_false_alarm!
      end
      redirect_to incidents_path(status: params[:filter_status] || "open")
    end

    private

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
        started_at_ago: i.started_at ? helpers.time_ago_in_words(i.started_at) + " ago" : "",
        resolved_at: i.resolved_at,
        occurred_at: i.occurred_at,
        ai_context: i.ai_context
      }
    end
  end
end

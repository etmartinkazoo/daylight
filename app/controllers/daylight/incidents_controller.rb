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

      page = (params[:page] || 1).to_i
      per_page = 50
      scope = scope.order(occurred_at: :desc).limit(per_page + 1).offset((page - 1) * per_page)

      incidents = scope.map { |i| serialize_incident(i) }
      has_more = incidents.length > per_page
      incidents = incidents.first(per_page)

      counts = {
        open: Database::IncidentRecord.where(status: "open").count,
        investigating: Database::IncidentRecord.where(status: "investigating").count,
        resolved: Database::IncidentRecord.where(status: "resolved").count,
        false_alarm: Database::IncidentRecord.where(status: "false_alarm").count,
        total: Database::IncidentRecord.count
      }

      incident_scope = Database::IncidentRecord.where("occurred_at > ?", period_start(period))

      render inertia: "daylight/incidents/index", props: {
        incidents: incidents,
        counts: counts,
        status: status,
        period: period,
        page: page,
        has_more: has_more,
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

      render inertia: "daylight/incidents/show", props: {
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
        started_at_ago: i.started_at ? helpers.time_ago_in_words(i.started_at) + " ago" : "",
        resolved_at: i.resolved_at,
        occurred_at: i.occurred_at
      }
    end
  end
end

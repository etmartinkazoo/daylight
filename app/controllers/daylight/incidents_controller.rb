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
      pagy, incidents = pagy(scope, limit: 20)

      incident_scope = Database::IncidentRecord.where("occurred_at > ?", period_start(period))

      render inertia: {
        incidents: InertiaRails.scroll(pagy) { IncidentResource.serialize(incidents) },
        counts: Database::IncidentRecord.status_counts,
        status: status,
        period: period,
        incident_series: time_series_buckets(incident_scope, period)
      }
    end

    def show
      incident = Database::IncidentRecord.find(params[:id])

      related_error = if incident.related_error_id
        err = Database::ErrorRecord.find_by(id: incident.related_error_id)
        err ? ErrorResource.serialize(err) : nil
      end

      related_deploy = if incident.related_deploy_id
        dep = Database::DeployRecord.find_by(id: incident.related_deploy_id)
        dep ? DeployResource.serialize(dep) : nil
      end

      render inertia: {
        incident: IncidentResource.serialize(incident),
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
  end
end

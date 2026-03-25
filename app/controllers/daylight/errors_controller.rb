# frozen_string_literal: true

module Daylight
  class ErrorsController < BaseController
    before_action :ensure_connected

    def index
      scope = Database::ErrorRecord.all

      status = params[:status].presence || "open"
      scope = scope.where(status: status) unless status == "all"

      if params[:q].present?
        term = "%#{params[:q]}%"
        scope = scope.where("error_class LIKE ? OR message LIKE ?", term, term)
      end

      scope = apply_sort(scope, default: "last_seen_at", allowed: %w[error_class occurrences_count last_seen_at first_seen_at], direction: "desc")

      errors = scope.limit(100).map { |e| serialize_error(e) }
      counts = {
        open: Database::ErrorRecord.where(status: "open").count,
        resolved: Database::ErrorRecord.where(status: "resolved").count,
        ignored: Database::ErrorRecord.where(status: "ignored").count,
        total: Database::ErrorRecord.count
      }

      render inertia: "daylight/index", props: {
        errors: errors,
        counts: counts,
        status: status,
        query: params[:q],
        **sort_props
      }
    end

    def show
      error = Database::ErrorRecord.find(params[:id])
      occurrences = Database::OccurrenceRecord
        .where(error_id: error.id)
        .order(occurred_at: :desc)
        .limit(50)
        .map { |o| serialize_occurrence(o) }

      render inertia: "daylight/show", props: {
        error: serialize_error(error),
        occurrences: occurrences
      }
    end

    def update
      error = Database::ErrorRecord.find(params[:id])
      error.update!(status: params[:status]) if %w[open resolved ignored].include?(params[:status])
      redirect_to errors_path(status: params[:filter_status] || "open")
    end

    def destroy
      error = Database::ErrorRecord.find(params[:id])
      Database::OccurrenceRecord.where(error_id: error.id).delete_all
      error.destroy!
      redirect_to errors_path
    end

    def batch
      ids = Array(params[:ids]).map(&:to_i)
      case params[:action_type]
      when "resolve"
        Database::ErrorRecord.where(id: ids).update_all(status: "resolved")
      when "ignore"
        Database::ErrorRecord.where(id: ids).update_all(status: "ignored")
      when "reopen"
        Database::ErrorRecord.where(id: ids).update_all(status: "open")
      when "delete"
        Database::OccurrenceRecord.where(error_id: ids).delete_all
        Database::ErrorRecord.where(id: ids).delete_all
      end
      redirect_to errors_path(status: params[:filter_status] || "open")
    end

    private

    def serialize_error(e)
      recent = Database::OccurrenceRecord
        .where(error_id: e.id)
        .order(occurred_at: :desc)
        .limit(5)
        .map { |o| serialize_occurrence(o) }

      {
        id: e.id,
        fingerprint: e.fingerprint,
        error_class: e.error_class,
        message: e.message,
        backtrace_summary: e.backtrace_summary,
        occurrences_count: e.occurrences_count,
        status: e.status,
        severity: e.severity,
        first_seen_at: e.first_seen_at,
        last_seen_at: e.last_seen_at,
        recent_occurrences: recent
      }
    end

    def serialize_occurrence(o)
      {
        id: o.id,
        backtrace: o.backtrace,
        context: (JSON.parse(o.context) rescue {}),
        request_url: o.request_url,
        request_method: o.request_method,
        occurred_at: o.occurred_at
      }
    end
  end
end

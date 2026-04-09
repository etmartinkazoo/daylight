# frozen_string_literal: true

module Daylight
  class ErrorsController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index = render_errors_list("open")

    def show
      error = Database::ErrorRecord.find(params[:id])
      occurrences = OccurrenceResource.serialize(
        Database::OccurrenceRecord.where(error_id: error.id).order(occurred_at: :desc).limit(50)
      )

      render inertia: {
        error: ErrorResource.serialize(error, params: { recent_occurrences: { error.id => occurrences } }),
        occurrences: occurrences
      }
    end

    def update
      error = Database::ErrorRecord.find(params[:id])
      error.update!(status: params[:status]) if %w[open resolved ignored].include?(params[:status])
      redirect_to errors_path_for(params[:return_status])
    end

    def destroy
      error = Database::ErrorRecord.find(params[:id])
      Database::OccurrenceRecord.where(error_id: error.id).delete_all
      error.destroy!
      redirect_to errors_path
    end

    private

    def render_errors_list(status)
      scope = Database::ErrorRecord.for_status(status)
      scope = scope.search(params[:q]) if params[:q].present?
      scope = apply_sort(scope, default: "last_seen_at",
                                allowed: %w[error_class occurrences_count last_seen_at first_seen_at], direction: "desc")
      pagy, errors = pagy(scope, limit: 20)

      recent_by_error_id = Database::OccurrenceRecord
                           .where(error_id: errors.map(&:id))
                           .order(occurred_at: :desc)
                           .group_by(&:error_id)
                           .transform_values { |occs| OccurrenceResource.serialize(occs.first(5)) }

      occurrence_scope = Database::OccurrenceRecord.where("occurred_at > ?", period_start(current_period))

      render inertia: "daylight/errors/index", props: {
        errors: InertiaRails.scroll(pagy) {
          ErrorResource.serialize(errors, params: { recent_occurrences: recent_by_error_id })
        },
        counts: Database::ErrorRecord.status_counts,
        status: status,
        query: params[:q] || "",
        unhandled_count: Database::ErrorRecord.unhandled.count,
        performance_count: Database::ErrorRecord.open.performance.count,
        error_series: time_series_buckets(occurrence_scope, current_period),
        deploys: deploys_in_period(current_period),
        **sort_props
      }
    end
  end
end

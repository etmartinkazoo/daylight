# frozen_string_literal: true

module Daylight
  class ErrorsController < BaseController
    include Daylight::TimeSeries
    include Daylight::ErrorRouting

    before_action :ensure_connected

    def index = render_errors_list("open")

    def show
      @error = Database::ErrorRecord.find(params[:id])
      @occurrences = Database::OccurrenceRecord.where(error_id: @error.id).order(occurred_at: :desc).limit(50)
    end

    def update
      error = Database::ErrorRecord.find(params[:id])
      error.status = params[:status]

      if error.save
        redirect_to errors_path_for(params[:return_status])
      else
        flash[:error] = error.errors.full_messages.to_sentence
        redirect_to errors_path_for(params[:return_status])
      end
    end

    def destroy
      error = Database::ErrorRecord.find(params[:id])
      error.destroy!
      redirect_to errors_path
    end

    private

    def render_errors_list(status)
      scope = Database::ErrorRecord.for_status(status)
      scope = scope.search(params[:q]) if params[:q].present?
      scope = apply_sort(scope, default: "last_seen_at",
                                allowed: %w[error_class occurrences_count last_seen_at first_seen_at], direction: "desc")
      @pagination, @errors = paginate(scope, limit: 20)

      occurrence_scope = Database::OccurrenceRecord.where(occurred_at: period_start(current_period)..)
      @counts = Database::ErrorRecord.status_counts
      @status = status
      @query = params[:q] || ""
      @unhandled_count = Database::ErrorRecord.unhandled.count
      @performance_count = Database::ErrorRecord.open.performance.count
      @error_series = time_series_buckets(occurrence_scope, current_period)
      @deploys = deploys_in_period(current_period)
      sort_props.each { |k, v| instance_variable_set(:"@#{k}", v) }
    end
  end
end

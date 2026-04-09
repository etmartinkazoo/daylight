# frozen_string_literal: true

module Daylight
  class ErrorExportsController < BaseController
    include Daylight::TimeSeries
    include Daylight::Exportable

    before_action :ensure_connected

    def show
      scope = Database::ErrorRecord.where("last_seen_at > ?", period_start(current_period))
      scope = scope.for_status(params[:status]) if params[:status].present?

      render_export(
        scope.order(last_seen_at: :desc),
        filename: "daylight-errors",
        csv_headers: %w[id error_class message severity status handled source occurrences_count first_seen_at last_seen_at],
        json_row: ->(e) { ErrorResource.serialize(e) }
      ) { |e| [e.id, e.error_class, e.message, e.severity, e.status, e.handled, e.try(:source), e.occurrences_count, e.first_seen_at, e.last_seen_at] }
    end
  end
end

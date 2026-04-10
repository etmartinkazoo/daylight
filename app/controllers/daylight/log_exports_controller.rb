# frozen_string_literal: true

module Daylight
  class LogExportsController < BaseController
    include Daylight::Exportable

    before_action :ensure_connected

    def show
      scope = Database::LogRecord.where(occurred_at: period_start(current_period)..)
      scope = scope.where(level: params[:level]) if params[:level].present?

      render_export(
        scope.order(occurred_at: :desc),
        filename: "daylight-logs",
        csv_headers: %w[id level message controller_action request_path occurred_at],
        json_row: ->(l) { LogResource.serialize(l) }
      ) { |l| [l.id, l.level, l.message, l.controller_action, l.request_path, l.occurred_at] }
    end
  end
end

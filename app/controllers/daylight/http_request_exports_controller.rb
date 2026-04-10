# frozen_string_literal: true

module Daylight
  class HttpRequestExportsController < BaseController
    include Daylight::Exportable

    before_action :ensure_connected

    def show
      scope = Database::HttpRequestRecord.where(occurred_at: period_start(current_period)..)
      scope = scope.where(host: params[:host]) if params[:host].present?

      render_export(
        scope.order(occurred_at: :desc),
        filename: "daylight-http-requests",
        csv_headers: %w[id method url host status_code duration_ms controller_action request_path occurred_at],
        json_row: ->(r) { HttpRequestResource.serialize(r) }
      ) { |r| [r.id, r.method, r.url, r.host, r.status_code, r.duration_ms, r.controller_action, r.request_path, r.occurred_at] }
    end
  end
end

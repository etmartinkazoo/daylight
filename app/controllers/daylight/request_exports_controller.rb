# frozen_string_literal: true

module Daylight
  class RequestExportsController < BaseController
    include Daylight::Exportable

    before_action :ensure_connected

    def show
      records = Database::RequestRecord
        .where(occurred_at: period_start(current_period)..)
        .order(occurred_at: :desc)

      render_export(
        records,
        filename: "daylight-requests",
        csv_headers: %w[id method path route_pattern controller_action status_code duration_ms db_duration_ms view_duration_ms query_count ip occurred_at],
        json_row: ->(r) { RequestResource.serialize(r) }
      ) { |r| [r.id, r.method, r.path, r.route_pattern, r.controller_action, r.status_code, r.duration_ms, r.db_duration_ms, r.view_duration_ms, r.query_count, r.ip, r.occurred_at] }
    end
  end
end

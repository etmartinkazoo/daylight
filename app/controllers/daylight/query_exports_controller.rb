# frozen_string_literal: true

module Daylight
  class QueryExportsController < BaseController
    include Daylight::Exportable

    before_action :ensure_connected

    def show
      records = Database::QueryRecord
        .where(occurred_at: period_start(current_period)..)
        .order(occurred_at: :desc)

      render_export(
        records,
        filename: "daylight-queries",
        csv_headers: %w[id sql normalized_sql duration_ms source_location controller_action request_path occurred_at],
        json_row: ->(q) { { id: q.id, sql: q.sql, normalized_sql: q.normalized_sql, duration_ms: q.duration_ms, source_location: q.source_location, controller_action: q.controller_action, request_path: q.request_path, occurred_at: q.occurred_at } }
      ) { |q| [q.id, q.sql, q.normalized_sql, q.duration_ms, q.source_location, q.controller_action, q.request_path, q.occurred_at] }
    end
  end
end

# frozen_string_literal: true

module Daylight
  class JobExportsController < BaseController
    include Daylight::Exportable

    before_action :ensure_connected

    def show
      records = Database::JobRecord
        .where(occurred_at: period_start(current_period)..)
        .order(occurred_at: :desc)

      render_export(
        records,
        filename: "daylight-jobs",
        csv_headers: %w[id job_class queue status duration_ms error_class error_message occurred_at],
        json_row: ->(j) { { id: j.id, job_class: j.job_class, queue: j.queue, status: j.status, duration_ms: j.duration_ms, error_class: j.error_class, error_message: j.error_message, occurred_at: j.occurred_at } }
      ) { |j| [j.id, j.job_class, j.queue, j.status, j.duration_ms, j.error_class, j.error_message, j.occurred_at] }
    end
  end
end

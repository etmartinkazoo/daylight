# frozen_string_literal: true

module Daylight
  class ScheduledTaskExportsController < BaseController
    include Daylight::Exportable

    before_action :ensure_connected

    def show
      records = Database::ScheduledTaskRecord
        .where(occurred_at: period_start(current_period)..)
        .order(occurred_at: :desc)

      render_export(
        records,
        filename: "daylight-scheduled-tasks",
        csv_headers: %w[id task_class status duration_ms error_class error_message occurred_at],
        json_row: ->(t) { ScheduledTaskResource.serialize(t) }
      ) { |t| [t.id, t.task_class, t.status, t.duration_ms, t.error_class, t.error_message, t.occurred_at] }
    end
  end
end

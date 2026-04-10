# frozen_string_literal: true

module Daylight
  class MailEventExportsController < BaseController
    include Daylight::Exportable

    before_action :ensure_connected

    def show
      records = Database::MailEventRecord
        .where(occurred_at: period_start(current_period)..)
        .order(occurred_at: :desc)

      render_export(
        records,
        filename: "daylight-mail-events",
        csv_headers: %w[id mailer_class action_name status duration_ms recipients error_message occurred_at],
        json_row: ->(e) { MailEventResource.serialize(e) }
      ) { |e| [e.id, e.mailer_class, e.action_name, e.status, e.duration_ms, e.recipients, e.error_message, e.occurred_at] }
    end
  end
end

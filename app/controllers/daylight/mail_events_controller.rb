# frozen_string_literal: true

module Daylight
  class MailEventsController < BaseController
    include Daylight::TimeSeries
    include Daylight::Exportable

    before_action :ensure_connected

    def index
      period = current_period
      scope = Database::MailEventRecord.where("occurred_at > ?", period_start(period))

      grouped = scope.group(:mailer_class).select(
        "mailer_class",
        "COUNT(*) as total",
        "SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count",
        "SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count",
        "ROUND(AVG(duration_ms), 1) as avg_duration"
      ).order(Arel.sql(sort_order_sql(
        default: "total",
        allowed: {
          "total" => "total",
          "delivered_count" => "delivered_count",
          "failed_count" => "failed_count",
          "avg_duration" => "avg_duration"
        },
        direction: "desc"
      )))

      count = scope.group(:mailer_class).count.length
      pagy, page_rows = pagy(:offset, grouped, count: count, limit: 50)
      mailers = page_rows.map do |row|
        {
          mailer_class: row.mailer_class,
          total: row.total,
          delivered_count: row.delivered_count,
          failed_count: row.failed_count,
          avg_duration: row.avg_duration
        }
      end

      # Individual events for drill-down by mailer (fixed top 50, no pagination)
      events = []
      if params[:mailer].present?
        events = scope.where(mailer_class: params[:mailer])
          .order(occurred_at: :desc)
          .limit(50)
          .map do |e|
            {
              id: e.id,
              mailer_class: e.mailer_class,
              action: e.try(:action),
              status: e.status,
              duration_ms: e.duration_ms,
              recipient: e.try(:recipient),
              error_message: e.try(:error_message),
              occurred_at: e.occurred_at
            }
          end
      end

      total = scope.count
      delivered = scope.where(status: "delivered").count
      failed = scope.where(status: "failed").count
      delivery_rate = total > 0 ? (delivered.to_f / total * 100).round(1) : 0

      render inertia: {
        mailers: InertiaRails.scroll(pagy) { mailers },
        events: events,
        selected_mailer: params[:mailer],
        period: period,
        totals: {
          total: total,
          delivered: delivered,
          failed: failed,
          delivery_rate: delivery_rate
        },
        volume_series: time_series_buckets(scope, period),
        **sort_props
      }
    end

    def export
      records = Database::MailEventRecord
        .where("occurred_at > ?", period_start(current_period))
        .order(occurred_at: :desc)

      render_export(
        records,
        filename: "daylight-mail-events",
        csv_headers: %w[id mailer_class action status duration_ms recipient error_message occurred_at],
        json_row: ->(e) { { id: e.id, mailer_class: e.mailer_class, action: e.try(:action), status: e.status, duration_ms: e.duration_ms, recipient: e.try(:recipient), error_message: e.try(:error_message), occurred_at: e.occurred_at } }
      ) { |e| [e.id, e.mailer_class, e.try(:action), e.status, e.duration_ms, e.try(:recipient), e.try(:error_message), e.occurred_at] }
    end

    private

  end
end

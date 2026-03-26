# frozen_string_literal: true

require "csv"

module Daylight
  class MailEventsController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = params[:period] || "24h"
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
      ))).limit(50)

      mailers = grouped.map do |row|
        {
          mailer_class: row.mailer_class,
          total: row.total,
          delivered_count: row.delivered_count,
          failed_count: row.failed_count,
          avg_duration: row.avg_duration
        }
      end

      # Individual events for drill-down by mailer
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

      render inertia: "daylight/mail_events", props: {
        mailers: mailers,
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
      period = params[:period] || "24h"
      scope = Database::MailEventRecord.where("occurred_at > ?", period_start(period))
      records = scope.order(occurred_at: :desc)

      if params[:format] == "json"
        render json: records.map { |e|
          { id: e.id, mailer_class: e.mailer_class, action: e.try(:action), status: e.status, duration_ms: e.duration_ms, recipient: e.try(:recipient), error_message: e.try(:error_message), occurred_at: e.occurred_at }
        }
      else
        csv_data = CSV.generate do |csv|
          csv << %w[id mailer_class action status duration_ms recipient error_message occurred_at]
          records.each do |e|
            csv << [e.id, e.mailer_class, e.try(:action), e.status, e.duration_ms, e.try(:recipient), e.try(:error_message), e.occurred_at]
          end
        end
        send_data csv_data, filename: "daylight-mail-events-#{Date.current}.csv", type: "text/csv"
      end
    end

    private

    def period_start(period)
      case period
      when "1h"  then 1.hour.ago
      when "24h" then 24.hours.ago
      when "7d"  then 7.days.ago
      when "30d" then 30.days.ago
      else 24.hours.ago
      end
    end
  end
end

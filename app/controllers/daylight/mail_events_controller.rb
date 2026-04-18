# frozen_string_literal: true

module Daylight
  class MailEventsController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = current_period
      scope = Database::MailEventRecord.where(occurred_at: period_start(period)..)

      grouped = scope.grouped_by_mailer.order(sort_order_sql(
        default: "total",
        allowed: {
          "total" => "total",
          "delivered_count" => "delivered_count",
          "failed_count" => "failed_count",
          "avg_duration" => "avg_duration"
        },
        direction: "desc"
      ))

      count = scope.group(:mailer_class).count.length
      @pagy, page_rows = pagy(:offset, grouped, count: count, limit: 20)
      mailers = page_rows.map do |row|
        {
          mailer_class: row.mailer_class,
          total: row.total,
          delivered_count: row.delivered_count,
          failed_count: row.failed_count,
          avg_duration: row.avg_duration
        }
      end

      events = if params[:mailer].present?
        scope.where(mailer_class: params[:mailer]).order(occurred_at: :desc).limit(50)
      else
        []
      end

      total = scope.count
      delivered = scope.delivered.count
      failed = scope.failed.count

      @mailers = mailers
      @events = events
      @selected_mailer = params[:mailer]
      @period = period
      @totals = {
        total: total,
        delivered: delivered,
        failed: failed,
        delivery_rate: total > 0 ? (delivered.to_f / total * 100).round(1) : 0
      }
      @volume_series = time_series_buckets(scope, period)
      sort_props.each { |k, v| instance_variable_set(:"@#{k}", v) }
    end
  end
end

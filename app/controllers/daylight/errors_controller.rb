# frozen_string_literal: true

require "csv"

module Daylight
  class ErrorsController < BaseController
    include Daylight::TimeSeries

    before_action :ensure_connected

    def index
      period = params[:period] || "24h"
      scope = Database::ErrorRecord.all

      status = params[:status].presence || "open"
      scope = scope.where(status: status) unless status == "all"

      # Filter by handled param
      case params[:handled]
      when "true"  then scope = scope.where(handled: true)
      when "false" then scope = scope.where(handled: false)
      end

      case params[:severity]
      when "error" then scope = scope.where(severity: "error")
      when "performance" then scope = scope.where(severity: "performance")
      end

      if params[:q].present?
        term = "%#{params[:q]}%"
        scope = scope.where("error_class LIKE ? OR message LIKE ?", term, term)
      end
scope = apply_sort(scope, default: "last_seen_at", allowed: %w[error_class occurrences_count last_seen_at first_seen_at], direction: "desc")

pagy, errors = pagy(scope, limit: 50)

counts = {
  open: Database::ErrorRecord.where(status: "open").count,
  resolved: Database::ErrorRecord.where(status: "resolved").count,
  ignored: Database::ErrorRecord.where(status: "ignored").count,
  unhandled: Database::ErrorRecord.where(handled: false).count,
  performance: Database::ErrorRecord.where(severity: "performance", status: "open").count,
  total: Database::ErrorRecord.count,
  last_24h: Database::ErrorRecord.where("last_seen_at > ?", 24.hours.ago).count
}

occurrence_scope = Database::OccurrenceRecord.where("occurred_at > ?", period_start(period))

render inertia: "daylight/index", props: {
  errors: InertiaRails.scroll(pagy) { errors.map { |e| serialize_error(e) } },
  counts: counts,
  status: status,
  query: params[:q] || "",
  unhandled_count: counts[:unhandled],
  performance: counts[:performance],
  error_series: time_series_buckets(occurrence_scope, period),
  deploys: deploys_in_period(period),
  **sort_props
}
end
    def show
      error = Database::ErrorRecord.find(params[:id])
      occurrences = Database::OccurrenceRecord
        .where(error_id: error.id)
        .order(occurred_at: :desc)
        .limit(50)
        .map { |o| serialize_occurrence(o) }

      render inertia: "daylight/show", props: {
        error: serialize_error(error),
        occurrences: occurrences
      }
    end

    def update
      error = Database::ErrorRecord.find(params[:id])
      error.update!(status: params[:status]) if %w[open resolved ignored].include?(params[:status])
      redirect_to errors_path(status: params[:filter_status] || "open")
    end

    def destroy
      error = Database::ErrorRecord.find(params[:id])
      Database::OccurrenceRecord.where(error_id: error.id).delete_all
      error.destroy!
      redirect_to errors_path
    end

    def export
      period = params[:period] || "24h"
      scope = Database::ErrorRecord.where("last_seen_at > ?", period_start(period))
      scope = scope.where(status: params[:status]) if params[:status].present? && params[:status] != "all"
      records = scope.order(last_seen_at: :desc)

      if params[:format] == "json"
        render json: records.map { |e| serialize_error(e) }
      else
        csv_data = CSV.generate do |csv|
          csv << %w[id error_class message severity status handled source occurrences_count first_seen_at last_seen_at]
          records.each do |e|
            csv << [e.id, e.error_class, e.message, e.severity, e.status, e.handled, e.try(:source), e.occurrences_count, e.first_seen_at, e.last_seen_at]
          end
        end
        send_data csv_data, filename: "daylight-errors-#{Date.current}.csv", type: "text/csv"
      end
    end

    def batch
      ids = Array(params[:ids]).map(&:to_i)
      case params[:action_type]
      when "resolve"
        Database::ErrorRecord.where(id: ids).update_all(status: "resolved")
      when "ignore"
        Database::ErrorRecord.where(id: ids).update_all(status: "ignored")
      when "reopen"
        Database::ErrorRecord.where(id: ids).update_all(status: "open")
      when "delete"
        Database::OccurrenceRecord.where(error_id: ids).delete_all
        Database::ErrorRecord.where(id: ids).delete_all
      end
      redirect_to errors_path(status: params[:filter_status] || "open")
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

    def serialize_error(e)
      recent = Database::OccurrenceRecord
        .where(error_id: e.id)
        .order(occurred_at: :desc)
        .limit(5)
        .map { |o| serialize_occurrence(o) }

      {
        id: e.id,
        fingerprint: e.fingerprint,
        error_class: e.error_class,
        message: e.message,
        backtrace_summary: e.backtrace_summary,
        occurrences_count: e.occurrences_count,
        status: e.status,
        severity: e.severity,
        handled: e.try(:handled),
        source: e.try(:source),
        affected_users_count: e.try(:affected_users_count) || 0,
        avg_duration_ms: e.try(:avg_duration_ms),
        max_duration_ms: e.try(:max_duration_ms),
        threshold_exceeded_count: e.try(:threshold_exceeded_count) || 0,
        first_seen_at: format_timestamp(e.first_seen_at),
        last_seen_at: format_timestamp(e.last_seen_at),
        last_seen_ago: helpers.time_ago_in_words(e.last_seen_at) + " ago",
        recent_occurrences: recent,
        ai_context: build_ai_context(e, recent)
      }
    end

    def serialize_occurrence(o)
      {
        id: o.id,
        backtrace: o.backtrace,
        context: (JSON.parse(o.context) rescue {}),
        request_url: o.request_url,
        request_method: o.request_method,
        occurred_at: format_timestamp(o.occurred_at)
      }
    end

    def format_timestamp(time)
      return "" if time.nil?
      time.strftime("%b %-d, %Y, %I:%M %p")
    end

    def build_ai_context(error, recent_occurrences)
      lines = [
        "Error: #{error.error_class}",
        "Message: #{error.message}",
        "Occurrences: #{error.occurrences_count}",
        "Status: #{error.status}",
        "First seen: #{error.first_seen_at}",
        "Last seen: #{error.last_seen_at}"
      ]
      lines << "\nBacktrace:\n#{error.backtrace_summary}" if error.backtrace_summary.present?

      occ = recent_occurrences.first
      if occ
        lines << "\nLast request: #{occ[:request_method]} #{occ[:request_url]}" if occ[:request_url].present?
        ctx = occ[:context] || {}
        lines << "Route: #{ctx["route"]}" if ctx["route"].present?
        lines << "Controller: #{ctx["controller_action"]}" if ctx["controller_action"].present?
        lines << "Tenant: #{ctx["tenant"]}" if ctx["tenant"].present?
        lines << "User: #{ctx["user_name"]}" if ctx["user_name"].present?
      end

      lines.join("\n")
    end
  end
end

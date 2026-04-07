# frozen_string_literal: true

module Daylight
  class TraceWaterfall
    def initialize(request_record)
      @request = request_record
      @trace_id = request_record.try(:trace_id)
    end

    def events
      return [] unless @trace_id.present?

      entries = []

      Database::QueryRecord.where(trace_id: @trace_id).order(:occurred_at).each do |q|
        entries << { type: "query", duration_ms: q.duration_ms, detail: q.normalized_sql || q.sql&.truncate(200), source: q.source_location, occurred_at: q.occurred_at }
      end

      Database::HttpRequestRecord.where(trace_id: @trace_id).order(:occurred_at).each do |h|
        entries << { type: "http", duration_ms: h.duration_ms, detail: "#{h.method} #{h.url&.truncate(200)}", status_code: h.status_code, occurred_at: h.occurred_at }
      end

      Database::CacheEventRecord.where(trace_id: @trace_id).order(:occurred_at).each do |c|
        entries << { type: "cache", duration_ms: c.duration_ms, detail: "#{c.event_type} #{c.key&.truncate(100)}", hit: c.hit, occurred_at: c.occurred_at }
      end

      Database::LogRecord.where(trace_id: @trace_id).order(:occurred_at).each do |l|
        entries << { type: "log", detail: l.message&.truncate(200), level: l.level, occurred_at: l.occurred_at }
      end

      Database::OccurrenceRecord.where(trace_id: @trace_id).order(:occurred_at).each do |o|
        err = Database::ErrorRecord.find_by(id: o.error_id)
        entries << { type: "exception", detail: "#{err&.error_class}: #{err&.message&.truncate(150)}", error_id: o.error_id, occurred_at: o.occurred_at }
      end

      entries.sort_by { |e| e[:occurred_at] }
    end
  end
end

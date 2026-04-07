# frozen_string_literal: true

module Daylight
  module TimeSeries
    extend ActiveSupport::Concern

    private

    BUCKET_CONFIG = {
      "1h" => { count: 12, seconds: 300, format: "%Y-%m-%dT%H:%M:00Z", step: 5.minutes },
      "24h" => { count: 24, seconds: 3600, format: "%Y-%m-%dT%H:00:00Z", step: 1.hour },
      "7d" => { count: 28, seconds: 21600, format: "%Y-%m-%dT%H:00:00Z", step: 6.hours },
      "30d" => { count: 30, seconds: 86400, format: "%Y-%m-%dT00:00:00Z", step: 1.day }
    }.freeze

    def time_series_buckets(scope, period, column: "occurred_at")
      config = BUCKET_CONFIG[period] || BUCKET_CONFIG["24h"]
      start_time = period_start(period)
      fmt = config[:format]

      # Use strftime to bucket timestamps
      rows = scope
             .where(column => start_time..)
             .group(Arel.sql("strftime('#{fmt}', #{column})"))
             .count

      # Build complete series with zero-fills
      build_series(start_time, config[:count], config[:step]) do |bucket_time|
        key = bucket_time.strftime(fmt.gsub("%", "%"))
        rows[key] || 0
      end
    end

    def time_series_avg(scope, period, value_column:, time_column: "occurred_at")
      config = BUCKET_CONFIG[period] || BUCKET_CONFIG["24h"]
      start_time = period_start(period)
      fmt = config[:format]

      rows = scope
             .where(time_column => start_time..)
             .group(Arel.sql("strftime('#{fmt}', #{time_column})"))
             .average(value_column)

      build_series(start_time, config[:count], config[:step]) do |bucket_time|
        key = bucket_time.strftime(fmt.gsub("%", "%"))
        rows[key]&.round(1) || 0
      end
    end

    def deploys_in_period(period)
      start_time = period_start(period)
      Database::DeployRecord
        .where(deployed_at: start_time..)
        .order(deployed_at: :desc)
        .map do |d|
          { t: d.deployed_at.iso8601, version: d.version, sha: d.git_sha }
        end
    rescue StandardError
      []
    end

    def build_series(start_time, count, step)
      series = []
      time = start_time
      count.times do
        series << { t: time.iso8601, v: yield(time) }
        time += step
      end
      series
    end
  end
end

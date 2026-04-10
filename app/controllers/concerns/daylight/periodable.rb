# frozen_string_literal: true

module Daylight
  module Periodable
    extend ActiveSupport::Concern

    PERIODS = {
      "1h"  => 1.hour,
      "24h" => 24.hours,
      "7d"  => 7.days,
      "30d" => 30.days
    }.freeze

    private

    def default_period = "24h"

    def current_period
      params[:period].presence || default_period
    end

    def period_start(period)
      PERIODS.fetch(period, 24.hours).ago
    end
  end
end

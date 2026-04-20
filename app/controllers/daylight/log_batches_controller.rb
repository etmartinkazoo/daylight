# frozen_string_literal: true

module Daylight
  class LogBatchesController < BaseController
    before_action :ensure_connected

    def create
      ids = Array(params[:ids]).flat_map { |v| v.split(",") }.map(&:to_i)

      case params[:action_type]
      when "delete" then Database::LogRecord.where(id: ids).destroy_all
      end

      redirect_to logs_path(level: params[:return_level], period: params[:return_period])
    end
  end
end

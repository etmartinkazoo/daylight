# frozen_string_literal: true

module Daylight
  class ErrorBatchesController < BaseController
    include Daylight::ErrorRouting

    before_action :ensure_connected

    def create
      ids = Array(params[:ids]).map(&:to_i)

      case params[:action_type]
      when "resolve" then Database::ErrorRecord.where(id: ids).update_all(status: "resolved")
      when "ignore"  then Database::ErrorRecord.where(id: ids).update_all(status: "ignored")
      when "reopen"  then Database::ErrorRecord.where(id: ids).update_all(status: "open")
      when "delete"  then Database::ErrorRecord.where(id: ids).destroy_all
      end

      redirect_to errors_path_for(params[:return_status])
    end
  end
end

# frozen_string_literal: true

module Daylight
  class ErrorBatchesController < BaseController
    before_action :ensure_connected

    def create
      ids = Array(params[:ids]).map(&:to_i)

      case params[:action_type]
      when "resolve" then Database::ErrorRecord.where(id: ids).update_all(status: "resolved")
      when "ignore"  then Database::ErrorRecord.where(id: ids).update_all(status: "ignored")
      when "reopen"  then Database::ErrorRecord.where(id: ids).update_all(status: "open")
      when "delete"
        Database::OccurrenceRecord.where(error_id: ids).delete_all
        Database::ErrorRecord.where(id: ids).delete_all
      end

      redirect_to errors_path_for(params[:return_status])
    end

    private

    def errors_path_for(status)
      case status
      when "resolved" then errors_resolved_path
      when "ignored"  then errors_ignored_path
      when "all"      then errors_all_path
      else                 errors_path
      end
    end
  end
end

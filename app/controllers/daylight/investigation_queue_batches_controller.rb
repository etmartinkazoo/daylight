# frozen_string_literal: true

module Daylight
  class InvestigationQueueBatchesController < BaseController
    before_action :ensure_connected

    def create
      ids = Array(params[:ids]).flat_map { |v| v.split(",") }.map(&:to_i)

      case params[:action_type]
      when "retry"
        Database::InvestigationQueueRecord.where(id: ids, status: "failed").update_all(
          status: "pending", error_message: nil, started_at: nil, completed_at: nil
        )
      when "delete"
        Database::InvestigationQueueRecord.where(id: ids).destroy_all
      end

      redirect_to investigation_queue_index_path(status: params[:return_status])
    end
  end
end

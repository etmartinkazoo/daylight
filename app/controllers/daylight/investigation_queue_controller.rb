# frozen_string_literal: true

module Daylight
  class InvestigationQueueController < BaseController
    before_action :ensure_connected

    def index
      @status = params[:status].presence || "all"
      scope = Database::InvestigationQueueRecord.all
      scope = scope.where(status: @status) unless @status == "all"
      scope = scope.order(Arel.sql("CASE status WHEN 'investigating' THEN 0 WHEN 'pending' THEN 1 WHEN 'failed' THEN 2 ELSE 3 END, queued_at DESC"))

      @items = scope.limit(100)
      @counts = {
        pending: Database::InvestigationQueueRecord.pending.count,
        investigating: Database::InvestigationQueueRecord.investigating.count,
        completed: Database::InvestigationQueueRecord.completed.count,
        failed: Database::InvestigationQueueRecord.failed.count
      }
    end
  end
end

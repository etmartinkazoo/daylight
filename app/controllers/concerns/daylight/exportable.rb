# frozen_string_literal: true

require "csv"

module Daylight
  module Exportable
    extend ActiveSupport::Concern

    private

    def render_export(records, filename:, csv_headers:, json_row:, &csv_row)
      if params[:format] == "json"
        render json: records.map { |r| json_row.call(r) }
      else
        csv_data = CSV.generate do |csv|
          csv << csv_headers
          records.each { |r| csv << csv_row.call(r) }
        end
        send_data csv_data, filename: "#{filename}-#{Date.current}.csv", type: "text/csv"
      end
    end
  end
end

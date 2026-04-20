# frozen_string_literal: true

module Daylight
  module AI
    class MentionsController < Daylight::BaseController
      skip_before_action :verify_authenticity_token
      before_action :ensure_connected

      def index
        query = params[:q].to_s.strip
        results = []

        # Search errors
        if query.blank? || "error".start_with?(query.downcase)
          Database::ErrorRecord.open.order(last_seen_at: :desc).limit(5).each do |e|
            results << { type: "Error", id: e.id, label: e.error_class, path: "/errors/#{e.id}" }
          end
        else
          Database::ErrorRecord.search(query).limit(5).each do |e|
            results << { type: "Error", id: e.id, label: e.error_class, path: "/errors/#{e.id}" }
          end
        end

        render json: { results: results }
      end
    end
  end
end

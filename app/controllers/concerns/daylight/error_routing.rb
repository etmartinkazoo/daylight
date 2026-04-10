# frozen_string_literal: true

module Daylight
  module ErrorRouting
    extend ActiveSupport::Concern

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

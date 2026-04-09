# frozen_string_literal: true

module Daylight
  module Errors
    class AllController < Daylight::ErrorsController
      def index = render_errors_list("all")
    end
  end
end

# frozen_string_literal: true

module Daylight
  module Errors
    class ResolvedController < Daylight::ErrorsController
      def index = render_errors_list("resolved")
    end
  end
end

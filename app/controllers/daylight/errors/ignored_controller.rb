# frozen_string_literal: true

module Daylight
  module Errors
    class IgnoredController < Daylight::ErrorsController
      def index = render_errors_list("ignored")
    end
  end
end

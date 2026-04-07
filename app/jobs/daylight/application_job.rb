# frozen_string_literal: true

module Daylight
  class ApplicationJob < ActiveJob::Base
    before_perform { Database.ensure_connected! }
  end
end

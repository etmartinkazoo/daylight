# frozen_string_literal: true

module Daylight
  class SolutionGenerationJob < ApplicationJob
    queue_as :default

    def perform = SolutionGenerator.generate!
  end
end

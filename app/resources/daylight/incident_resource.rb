# frozen_string_literal: true

module Daylight
  class IncidentResource < BaseResource
    include ActionView::Helpers::DateHelper

    attributes :id, :incident_type, :title, :summary, :status, :severity,
               :investigation, :related_error_id, :related_deploy_id,
               :started_at, :resolved_at, :occurred_at

    attribute :trigger_data do |i|
      JSON.parse(i.trigger_data) rescue {}
    end

    attribute :started_at_ago do |i|
      i.started_at ? time_ago_in_words(i.started_at) + " ago" : ""
    end

    attribute :ai_context do |i|
      i.ai_context
    end
  end
end
